"""
Scan local directories for projects and detect stack/git info.
Port of projects-scanner.ts from dashboard v1.
"""
import os
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DocFile:
    """A documentation or notable file in a project."""
    relative_path: str
    category: str  # doc, sql, schema, config, ci, other
    size_bytes: int = 0
    language: str = ''


@dataclass
class ProjectInfo:
    name: str
    path: str
    stack: str = ''
    branch: str = ''
    last_commit: str = ''
    last_commit_date: str = ''
    is_dirty: bool = False
    has_mugiwara: bool = False
    has_git: bool = False
    has_remote: bool = False
    commits_ahead: int = 0
    commits_behind: int = 0
    category: str = 'pro'
    invocations: int = 0
    last_used: Optional[str] = None
    docs: list = field(default_factory=list)
    doc_files: list = field(default_factory=list)  # list[DocFile]
    claude_session_count: int = 0


# Stack detection rules: (marker file, stack name)
STACK_MARKERS = [
    ('package.json', 'Node.js'),
    ('tsconfig.json', 'TypeScript'),
    ('go.mod', 'Go'),
    ('Cargo.toml', 'Rust'),
    ('pyproject.toml', 'Python'),
    ('requirements.txt', 'Python'),
    ('setup.py', 'Python'),
    ('pom.xml', 'Java'),
    ('build.gradle', 'Java/Kotlin'),
    ('*.csproj', 'C#/.NET'),
    ('*.sln', 'C#/.NET'),
    ('pubspec.yaml', 'Flutter/Dart'),
    ('Gemfile', 'Ruby'),
    ('mix.exs', 'Elixir'),
    ('composer.json', 'PHP'),
]

# Doc file patterns (simple name check)
DOC_PATTERNS = [
    'README.md', 'README.rst', 'README.txt',
    'CLAUDE.md', 'AGENTS.md', 'GEMINI.md',
    'docs/', 'doc/',
]

# File extension → (category, language) mapping
DOC_FILE_RULES = {
    # Documentation
    '.md': ('doc', 'markdown'),
    '.mdx': ('doc', 'markdown'),
    '.rst': ('doc', 'restructuredtext'),
    '.txt': ('doc', 'text'),
    # SQL
    '.sql': ('sql', 'sql'),
    # Schema
    '.prisma': ('schema', 'prisma'),
    '.graphql': ('schema', 'graphql'),
    '.gql': ('schema', 'graphql'),
    '.proto': ('schema', 'protobuf'),
    # Config
    '.yaml': ('config', 'yaml'),
    '.yml': ('config', 'yaml'),
    '.toml': ('config', 'toml'),
    '.json': ('config', 'json'),
    '.env.example': ('config', 'env'),
    # CI/CD
    '.travis.yml': ('ci', 'yaml'),
}

# Files always included by exact name
DOC_EXACT_FILES = {
    'Dockerfile': ('config', 'dockerfile'),
    'Makefile': ('config', 'makefile'),
    'Jenkinsfile': ('ci', 'groovy'),
    'CONTRIBUTING.md': ('doc', 'markdown'),
    'CHANGELOG.md': ('doc', 'markdown'),
    'LICENSE': ('doc', 'text'),
    'LICENSE.md': ('doc', 'markdown'),
}

# Directories to skip during doc file scan
SKIP_DIRS = {
    'node_modules', '.git', '.svn', '__pycache__', '.venv', 'venv',
    'dist', 'build', '.next', '.nuxt', 'target', 'vendor', '.dart_tool',
    'coverage', '.cache', '.turbo', '.vercel', 'android', 'ios',
}

MAX_DOC_FILE_SIZE = 500 * 1024  # 500 KB


def _is_project(path: Path) -> bool:
    """A directory is a project if it contains a stack marker or a .git folder."""
    if (path / '.git').exists():
        return True
    for marker, _ in STACK_MARKERS:
        if '*' in marker:
            if list(path.glob(marker)):
                return True
        elif (path / marker).exists():
            return True
    return False


def _collect_project_dirs(base: Path, max_depth: int = 4) -> list[Path]:
    """
    Collect project directories, recursing into organizational folders.
    A folder that is not itself a project (no .git, no stack marker) is treated
    as an organizational folder and its children are scanned (up to max_depth).
    """
    results = []
    try:
        entries = sorted(base.iterdir())
    except PermissionError:
        return results

    for entry in entries:
        if not entry.is_dir() or entry.name.startswith('.'):
            continue
        if _is_project(entry):
            results.append(entry)
        elif max_depth > 1:
            # Organizational folder — recurse one level deeper
            results.extend(_collect_project_dirs(entry, max_depth - 1))
    return results


def detect_stack(project_path: Path) -> str:
    """Detect the primary stack of a project."""
    for marker, stack in STACK_MARKERS:
        if '*' in marker:
            if list(project_path.glob(marker)):
                return stack
        elif (project_path / marker).exists():
            return stack
    return 'Unknown'


def get_git_info(project_path: Path) -> dict:
    """Get git branch, last commit, dirty status, and ahead/behind counts."""
    info = {
        'branch': '', 'last_commit': '', 'last_commit_date': '',
        'is_dirty': False, 'has_git': False, 'has_remote': False,
        'commits_ahead': 0, 'commits_behind': 0,
    }

    git_dir = project_path / '.git'
    if not git_dir.exists():
        return info

    info['has_git'] = True

    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            cwd=str(project_path), capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            info['branch'] = result.stdout.strip()

        result = subprocess.run(
            ['git', 'log', '-1', '--format=%s'],
            cwd=str(project_path), capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            info['last_commit'] = result.stdout.strip()[:100]

        result = subprocess.run(
            ['git', 'log', '-1', '--format=%ci'],
            cwd=str(project_path), capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            info['last_commit_date'] = result.stdout.strip()

        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            cwd=str(project_path), capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            info['is_dirty'] = bool(result.stdout.strip())

        # Check for remote tracking branch and ahead/behind
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
            cwd=str(project_path), capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            info['has_remote'] = True
            upstream = result.stdout.strip()
            result = subprocess.run(
                ['git', 'rev-list', '--left-right', '--count', f'HEAD...{upstream}'],
                cwd=str(project_path), capture_output=True, text=True, timeout=5,
            )
            if result.returncode == 0:
                parts = result.stdout.strip().split()
                if len(parts) == 2:
                    info['commits_ahead'] = int(parts[0])
                    info['commits_behind'] = int(parts[1])

    except (subprocess.TimeoutExpired, FileNotFoundError, OSError, ValueError):
        pass

    return info


def detect_docs(project_path: Path) -> list[str]:
    """Find documentation files in the project (simple list for cards)."""
    docs = []
    for pattern in DOC_PATTERNS:
        if pattern.endswith('/'):
            if (project_path / pattern.rstrip('/')).is_dir():
                docs.append(pattern)
        elif (project_path / pattern).exists():
            docs.append(pattern)
    return docs


def scan_doc_files(project_path: Path, max_depth: int = 2) -> list[DocFile]:
    """
    Scan project for documentation and notable files.
    Returns DocFile objects with category, size, and language.
    """
    doc_files = []
    base = project_path

    def _scan(current: Path, depth: int):
        if depth > max_depth:
            return
        try:
            entries = sorted(current.iterdir())
        except PermissionError:
            return

        for entry in entries:
            if entry.is_dir():
                if entry.name in SKIP_DIRS or entry.name.startswith('.'):
                    continue
                # Special: include github workflows
                if entry.name == '.github':
                    _scan(entry, depth + 1)
                    continue
                _scan(entry, depth + 1)
            elif entry.is_file():
                rel = str(entry.relative_to(base)).replace('\\', '/')
                name = entry.name

                # Check exact file matches first
                if name in DOC_EXACT_FILES:
                    cat, lang = DOC_EXACT_FILES[name]
                    try:
                        size = entry.stat().st_size
                    except OSError:
                        size = 0
                    if size <= MAX_DOC_FILE_SIZE:
                        doc_files.append(DocFile(
                            relative_path=rel, category=cat,
                            size_bytes=size, language=lang,
                        ))
                    continue

                # Check extension rules
                suffix = entry.suffix.lower()
                if suffix in DOC_FILE_RULES:
                    cat, lang = DOC_FILE_RULES[suffix]

                    # Skip package-lock.json and similar large json
                    if suffix == '.json' and name in (
                        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
                        'composer.lock', 'Pipfile.lock',
                    ):
                        continue

                    # CI files detection
                    if current.name == 'workflows' and suffix in ('.yml', '.yaml'):
                        cat = 'ci'
                    if name == '.gitlab-ci.yml':
                        cat = 'ci'

                    try:
                        size = entry.stat().st_size
                    except OSError:
                        size = 0

                    if size <= MAX_DOC_FILE_SIZE:
                        doc_files.append(DocFile(
                            relative_path=rel, category=cat,
                            size_bytes=size, language=lang,
                        ))

    _scan(base, 0)
    return doc_files


def count_claude_sessions(project_name: str) -> int:
    """Count Claude Code sessions for a project from ~/.claude/projects/."""
    claude_dir = Path.home() / '.claude' / 'projects'
    if not claude_dir.exists():
        return 0

    count = 0
    try:
        for entry in claude_dir.iterdir():
            if not entry.is_dir():
                continue
            # Claude stores projects with path-based names
            if project_name.lower() in entry.name.lower():
                # Count .jsonl session files
                count += len(list(entry.glob('*.jsonl')))
    except (PermissionError, OSError):
        pass
    return count


def scan_projects(directories: list[str] | None = None) -> list[ProjectInfo]:
    """
    Scan directories for projects.
    Default: ~/Documents/projet/ + EXTRA_PROJECT_DIRS from settings.
    Recurses into organizational folders (up to 4 levels) to find nested projects.
    Extra directories are scanned with depth=1 to avoid pulling in non-project dirs.
    """
    if not directories:
        default_dir = Path.home() / 'Documents' / 'projet'
        directories = [str(default_dir)] if default_dir.exists() else []

    # Collect all project directories (with recursion into org folders)
    all_entries = []
    seen_paths: set[str] = set()

    for dir_path in directories:
        base = Path(dir_path)
        if not base.exists() or not base.is_dir():
            continue
        for entry in _collect_project_dirs(base):
            resolved = str(entry.resolve())
            if resolved not in seen_paths:
                seen_paths.add(resolved)
                all_entries.append((entry, base))

    # Scan extra directories (shallow — depth 1) from settings
    try:
        from django.conf import settings
        extra_dirs = getattr(settings, 'EXTRA_PROJECT_DIRS', [])
    except Exception:
        extra_dirs = []

    for dir_path in extra_dirs:
        base = Path(dir_path)
        if not base.exists() or not base.is_dir():
            continue
        for entry in _collect_project_dirs(base, max_depth=1):
            resolved = str(entry.resolve())
            if resolved not in seen_paths:
                seen_paths.add(resolved)
                all_entries.append((entry, base))

    # Detect duplicate names to prefix with parent folder
    name_counts: dict[str, int] = {}
    for entry, _ in all_entries:
        name_counts[entry.name] = name_counts.get(entry.name, 0) + 1

    projects = []
    for entry, base in all_entries:
        stack = detect_stack(entry)
        git_info = get_git_info(entry)
        docs = detect_docs(entry)
        doc_files = scan_doc_files(entry)
        has_mugiwara = (entry / '.claude').exists() or (entry / 'CLAUDE.md').exists()

        # Build display name: prefix with parent folder if duplicate
        # Use " — " separator (not "/") to stay URL-compatible with Django routes
        if name_counts.get(entry.name, 1) > 1 and entry.parent != base:
            display_name = f"{entry.parent.name} -- {entry.name}"
        else:
            display_name = entry.name

        claude_sessions = count_claude_sessions(entry.name)

        projects.append(ProjectInfo(
            name=display_name,
            path=str(entry),
            stack=stack,
            branch=git_info['branch'],
            last_commit=git_info['last_commit'],
            last_commit_date=git_info['last_commit_date'],
            is_dirty=git_info['is_dirty'],
            has_mugiwara=has_mugiwara,
            has_git=git_info['has_git'],
            has_remote=git_info['has_remote'],
            commits_ahead=git_info['commits_ahead'],
            commits_behind=git_info['commits_behind'],
            docs=docs,
            doc_files=doc_files,
            claude_session_count=claude_sessions,
        ))

    return projects
