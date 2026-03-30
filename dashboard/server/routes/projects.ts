// ============================================================
// Projects API Routes
// GET  /api/projects              - List projects (paginated, filterable)
// GET  /api/projects/:name        - Get single project detail
// POST /api/projects/scan         - Force re-scan
// POST /api/projects/:name/open   - Open PowerShell + Claude
// POST /api/projects/:name/run-agent - Open PowerShell + Claude + agent
// PUT  /api/projects/config       - Update scan config
// POST /api/projects/add          - Add project manually
// GET  /api/projects/:name/sessions - Get session history for a project
// ============================================================

import { Router } from 'express';
import { exec, execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import nodePath from 'path';
import {
  getProjects,
  forceRescan,
  getProjectByName,
  loadProjectsConfig,
  saveProjectsConfig,
  addManualProject,
  getLastScanTime,
  ensureProjectsConfig,
} from '../parsers/projects-scanner.js';
import { getProjectSessions, getProjectTimeline, getProjectAgentDistribution } from '../db/queries.js';
import { getClaudeSessions } from '../parsers/claude-sessions-parser.js';
import type { ProjectsQuery, Category, ProjectSession, ProjectTimelineResponse, ProjectGitCommit } from '../../shared/types.js';

const router = Router();

// Ensure default config exists on first load
ensureProjectsConfig();

// List projects with filtering, sorting, pagination
router.get('/projects', (req, res) => {
  try {
    const query: ProjectsQuery = {
      page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50,
      search: req.query['search'] as string | undefined,
      category: req.query['category'] as Category | undefined,
      stack: req.query['stack'] as string | undefined,
      sort: (req.query['sort'] as ProjectsQuery['sort']) ?? 'name',
      order: (req.query['order'] as ProjectsQuery['order']) ?? 'asc',
    };

    let projects = getProjects();

    // Filter by search
    if (query.search) {
      const s = query.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.path.toLowerCase().includes(s) ||
          p.stack.some((t) => t.toLowerCase().includes(s))
      );
    }

    // Filter by category
    if (query.category) {
      projects = projects.filter((p) => p.category === query.category);
    }

    // Filter by stack
    if (query.stack) {
      const stackFilter = query.stack.toLowerCase();
      projects = projects.filter((p) =>
        p.stack.some((t) => t.toLowerCase() === stackFilter)
      );
    }

    // Sort
    const sortKey = query.sort ?? 'name';
    const sortOrder = query.order === 'desc' ? -1 : 1;
    projects.sort((a, b) => {
      switch (sortKey) {
        case 'lastModified':
          return sortOrder * ((a.lastModified ?? '').localeCompare(b.lastModified ?? ''));
        case 'category':
          return sortOrder * a.category.localeCompare(b.category);
        case 'name':
        default:
          return sortOrder * a.name.localeCompare(b.name);
      }
    });

    const total = projects.length;

    // Paginate
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const start = (page - 1) * limit;
    const paged = projects.slice(start, start + limit);

    const config = loadProjectsConfig();

    res.json({
      data: paged,
      total,
      scanDirs: config.scanDirs,
      lastScan: getLastScanTime(),
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to load projects' });
  }
});

// Get single project
router.get('/projects/:name', (req, res) => {
  try {
    const project = getProjectByName(req.params['name']!);
    if (!project) {
      res.status(404).json({ error: 'not_found', message: `Project "${req.params['name']}" not found` });
      return;
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to load project' });
  }
});

// Get session history for a project
router.get('/projects/:name/sessions', (req, res) => {
  try {
    const name = req.params['name']!;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;

    const rows = getProjectSessions(name, limit);
    const sessions: ProjectSession[] = rows.map((r) => ({
      sessionId: r.session_id,
      startTime: r.start_time,
      agents: r.agents ? r.agents.split(',').filter(Boolean) : [],
      invocationCount: r.invocation_count,
      pipelineDetected: r.pipeline_detected ?? null,
    }));

    res.json({ sessions, total: sessions.length });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to load project sessions' });
  }
});

// Get Claude Code session history for a project (from ~/.claude/projects/)
router.get('/projects/:name/claude-sessions', (req, res) => {
  try {
    const project = getProjectByName(req.params['name']!);
    if (!project) {
      res.status(404).json({ error: 'not_found', message: `Project "${req.params['name']}" not found` });
      return;
    }

    const sessions = getClaudeSessions(project.path);
    res.json({ sessions, total: sessions.length });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to load Claude sessions' });
  }
});

// Get file content from a project
router.get('/projects/:name/file', (req, res) => {
  try {
    const project = getProjectByName(req.params['name']!);
    if (!project) {
      res.status(404).json({ error: 'not_found', message: `Project "${req.params['name']}" not found` });
      return;
    }

    const relativePath = req.query['path'] as string | undefined;
    if (!relativePath) {
      res.status(400).json({ error: 'bad_request', message: 'path query parameter is required' });
      return;
    }

    // Security: prevent path traversal
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      res.status(400).json({ error: 'bad_request', message: 'Invalid file path' });
      return;
    }

    const fullPath = nodePath.resolve(project.path, relativePath);
    // Ensure resolved path is within project directory
    if (!fullPath.startsWith(nodePath.resolve(project.path))) {
      res.status(400).json({ error: 'bad_request', message: 'File path outside project directory' });
      return;
    }

    // Check file size (max 500KB)
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      res.status(404).json({ error: 'not_found', message: `File "${relativePath}" not found` });
      return;
    }

    if (stat.size > 500 * 1024) {
      res.status(413).json({ error: 'too_large', message: `File too large (${(stat.size / 1024).toFixed(0)}KB, max 500KB)` });
      return;
    }

    const content = readFileSync(fullPath, 'utf-8');
    const ext = nodePath.extname(relativePath).toLowerCase().replace('.', '');

    // Map extensions to language names
    const langMap: Record<string, string> = {
      md: 'markdown', mdx: 'markdown', sql: 'sql', yml: 'yaml', yaml: 'yaml',
      json: 'json', toml: 'toml', prisma: 'prisma', graphql: 'graphql',
      gql: 'graphql', proto: 'protobuf', ts: 'typescript', js: 'javascript',
      py: 'python', rs: 'rust', go: 'go', rb: 'ruby', sh: 'shell',
      bash: 'shell', txt: 'text', xml: 'xml', html: 'html', css: 'css',
      dockerfile: 'dockerfile', makefile: 'makefile', '': 'text',
    };

    const fileName = nodePath.basename(relativePath).toLowerCase();
    let language = langMap[ext] ?? 'text';
    if (fileName === 'dockerfile') language = 'dockerfile';
    if (fileName === 'makefile') language = 'makefile';

    res.json({
      content,
      name: nodePath.basename(relativePath),
      path: relativePath,
      size: stat.size,
      language,
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to read file' });
  }
});

// Force re-scan
router.post('/projects/scan', (_req, res) => {
  try {
    const projects = forceRescan();
    const config = loadProjectsConfig();
    res.json({
      data: projects,
      total: projects.length,
      scanDirs: config.scanDirs,
      lastScan: getLastScanTime(),
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to scan projects' });
  }
});

// Open PowerShell + Claude in project directory
router.post('/projects/:name/open', (req, res) => {
  try {
    const project = getProjectByName(req.params['name']!);
    if (!project) {
      res.status(404).json({ error: 'not_found', message: `Project "${req.params['name']}" not found` });
      return;
    }

    const { dangerouslySkipPermissions } = req.body as { dangerouslySkipPermissions?: boolean };
    const escapedPath = project.path.replace(/'/g, "''");
    const claudeCmd = dangerouslySkipPermissions ? 'claude --dangerously-skip-permissions' : 'claude';
    const cmd = `start powershell -NoExit -Command "cd '${escapedPath}'; ${claudeCmd}"`;

    exec(cmd, { shell: 'cmd.exe' }, (err) => {
      if (err) {
        console.error(`[projects] Failed to open Claude for ${project.name}:`, err.message);
        res.status(500).json({ error: 'exec_failed', message: 'Failed to open PowerShell' });
        return;
      }
      res.json({ success: true, project: project.name, action: 'open_claude', dangerouslySkipPermissions: !!dangerouslySkipPermissions });
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to open project' });
  }
});

// Open PowerShell + Claude + Agent
router.post('/projects/:name/run-agent', (req, res) => {
  try {
    const project = getProjectByName(req.params['name']!);
    if (!project) {
      res.status(404).json({ error: 'not_found', message: `Project "${req.params['name']}" not found` });
      return;
    }

    const { agent, message } = req.body as { agent?: string; message?: string };
    if (!agent) {
      res.status(400).json({ error: 'bad_request', message: 'agent field is required' });
      return;
    }

    const escapedPath = project.path.replace(/'/g, "''");
    const prompt = message ? `/${agent} ${message}` : `/${agent}`;
    const escapedPrompt = prompt.replace(/'/g, "''");
    const cmd = `start powershell -NoExit -Command "cd '${escapedPath}'; claude '${escapedPrompt}'"`;

    exec(cmd, { shell: 'cmd.exe' }, (err) => {
      if (err) {
        console.error(`[projects] Failed to run agent for ${project.name}:`, err.message);
        res.status(500).json({ error: 'exec_failed', message: 'Failed to open PowerShell' });
        return;
      }
      res.json({ success: true, project: project.name, action: 'run_agent', agent, message });
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to run agent' });
  }
});

// Open File Explorer in project directory
router.post('/projects/:name/explore', (req, res) => {
  try {
    const project = getProjectByName(req.params['name']!);
    if (!project) {
      res.status(404).json({ error: 'not_found', message: `Project "${req.params['name']}" not found` });
      return;
    }

    const escapedPath = project.path.replace(/"/g, '\\"');
    const cmd = `explorer.exe "${escapedPath}"`;

    exec(cmd, { shell: 'cmd.exe' }, (err) => {
      if (err) {
        console.error(`[projects] Failed to open explorer for ${project.name}:`, err.message);
        res.status(500).json({ error: 'exec_failed', message: 'Failed to open File Explorer' });
        return;
      }
      res.json({ success: true, project: project.name, action: 'open_explorer' });
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to open explorer' });
  }
});

// Project timeline (invocations + sessions)
router.get('/projects/:name/timeline', (req, res) => {
  try {
    const project = getProjectByName(req.params['name']!);
    if (!project) {
      res.status(404).json({ error: 'not_found', message: `Project "${req.params['name']}" not found` });
      return;
    }

    const timeline = getProjectTimeline(project.name, 50);
    const agentDistribution = getProjectAgentDistribution(project.name);

    // Git activity — run git log in project directory
    const gitCommits: ProjectGitCommit[] = [];
    try {
      // Use %x00 (null byte) as delimiter to avoid Windows cmd.exe issues with | and "
      const gitLog = execSync(
        'git log --format=%H%x00%s%x00%aI%x00%an -20',
        { cwd: project.path, encoding: 'utf-8', timeout: 5000 }
      );
      for (const line of gitLog.trim().split('\n')) {
        if (!line) continue;
        const [hash, message, date, author] = line.split('\0');
        if (hash && message && date && author) {
          gitCommits.push({ hash: hash.substring(0, 8), message, date, author });
        }
      }
    } catch {
      // Git not available or not a git repo — ignore
    }

    const response: ProjectTimelineResponse = {
      entries: timeline.map((t) => ({
        timestamp: t.timestamp,
        type: t.type as 'invocation' | 'session',
        agent: t.agent ?? undefined,
        sessionId: t.session_id ?? undefined,
        pipeline: t.pipeline ?? undefined,
      })),
      gitCommits,
      agentDistribution,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to get project timeline' });
  }
});

// Update projects config
router.put('/projects/config', (req, res) => {
  try {
    const config = req.body as { scanDirs?: string[]; maxDepth?: number; ignoreDirs?: string[] };
    const current = loadProjectsConfig();

    const updated = {
      ...current,
      ...(config.scanDirs && { scanDirs: config.scanDirs }),
      ...(config.maxDepth !== undefined && { maxDepth: config.maxDepth }),
      ...(config.ignoreDirs && { ignoreDirs: config.ignoreDirs }),
    };

    saveProjectsConfig(updated);

    // Re-scan with new config
    const projects = forceRescan();
    res.json({
      config: updated,
      data: projects,
      total: projects.length,
      scanDirs: updated.scanDirs,
      lastScan: getLastScanTime(),
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to update config' });
  }
});

// Add project manually
router.post('/projects/add', (req, res) => {
  try {
    const { path: projectPath, category } = req.body as { path?: string; category?: Category };
    if (!projectPath) {
      res.status(400).json({ error: 'bad_request', message: 'path field is required' });
      return;
    }

    addManualProject(projectPath, category);

    // Re-scan to include the new project
    const projects = forceRescan();
    const added = getProjectByName(projectPath.split(/[/\\]/).pop()!);

    res.json({
      success: true,
      project: added ?? null,
      total: projects.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to add project' });
  }
});

export default router;
