#!/bin/bash
# ============================================================
# Mugiwara Agents — Project Management Functions
# Shared functions for project init, config, and CLAUDE.md gen
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Source dependencies
source "$SCRIPT_DIR/lib/colors.sh"

# ─── Stack Detection ───

detect_stack() {
    local project_dir="${1:-.}"
    local stacks=()

    # JavaScript / TypeScript
    [[ -f "$project_dir/package.json" ]] && stacks+=("javascript")
    [[ -f "$project_dir/tsconfig.json" ]] && stacks+=("typescript")

    # Framework detection from package.json
    if [[ -f "$project_dir/package.json" ]]; then
        local pkg_content
        pkg_content=$(cat "$project_dir/package.json" 2>/dev/null || echo "{}")

        echo "$pkg_content" | grep -q '"next"' && stacks+=("nextjs")
        echo "$pkg_content" | grep -q '"react"' && stacks+=("react")
        echo "$pkg_content" | grep -q '"vue"' && stacks+=("vue")
        echo "$pkg_content" | grep -q '"@angular/core"' && stacks+=("angular")
        echo "$pkg_content" | grep -q '"svelte"' && stacks+=("svelte")
        echo "$pkg_content" | grep -q '"express"' && stacks+=("express")
        echo "$pkg_content" | grep -q '"@nestjs/core"' && stacks+=("nestjs")
    fi

    # Python
    [[ -f "$project_dir/requirements.txt" ]] || [[ -f "$project_dir/pyproject.toml" ]] || [[ -f "$project_dir/setup.py" ]] && stacks+=("python")
    [[ -f "$project_dir/dbt_project.yml" ]] && stacks+=("dbt")

    # Go
    [[ -f "$project_dir/go.mod" ]] && stacks+=("go")

    # Rust
    [[ -f "$project_dir/Cargo.toml" ]] && stacks+=("rust")

    # Java / Kotlin
    [[ -f "$project_dir/pom.xml" ]] || [[ -f "$project_dir/build.gradle" ]] || [[ -f "$project_dir/build.gradle.kts" ]] && stacks+=("java")

    # Flutter / Dart
    [[ -f "$project_dir/pubspec.yaml" ]] && stacks+=("flutter")

    # .NET / C#
    ls "$project_dir"/*.csproj 2>/dev/null | head -1 > /dev/null && stacks+=("dotnet")
    ls "$project_dir"/*.sln 2>/dev/null | head -1 > /dev/null && stacks+=("dotnet")

    # Docker
    [[ -f "$project_dir/Dockerfile" ]] || [[ -f "$project_dir/docker-compose.yml" ]] || [[ -f "$project_dir/docker-compose.yaml" ]] && stacks+=("docker")

    # Kubernetes / Terraform
    [[ -d "$project_dir/k8s" ]] || [[ -d "$project_dir/kubernetes" ]] && stacks+=("kubernetes")
    ls "$project_dir"/*.tf 2>/dev/null | head -1 > /dev/null && stacks+=("terraform")

    # Remove duplicates and output
    printf '%s\n' "${stacks[@]}" | sort -u | tr '\n' ' '
}

# ─── Preset Matching ───

suggest_preset() {
    local stacks="$1"
    local presets_dir="$SCRIPT_DIR/skills/one_piece/presets"

    # Priority-ordered matching
    if echo "$stacks" | grep -qE "flutter|dart|react-native"; then
        echo "mobile"
    elif echo "$stacks" | grep -qE "dbt|spark|airflow|dagster|jupyter"; then
        echo "data-engineering"
    elif echo "$stacks" | grep -qE "kubernetes|terraform|ansible|helm"; then
        echo "devops"
    elif echo "$stacks" | grep -qE "typescript|javascript|nextjs|react|vue|angular|svelte|express|nestjs"; then
        echo "web-fullstack"
    elif echo "$stacks" | grep -qE "python|go|rust|java|dotnet"; then
        echo "web-fullstack"
    else
        echo "minimal"
    fi
}

# ─── Project Config Generation ───

generate_project_yaml() {
    local project_dir="$1"
    local preset_name="$2"
    local project_name="$3"
    local stacks="$4"
    local presets_dir="$SCRIPT_DIR/skills/one_piece/presets"
    local preset_file="$presets_dir/${preset_name}.yaml"
    local output_file="$project_dir/.mugiwara/project.yaml"

    mkdir -p "$project_dir/.mugiwara"

    # Read active agents from preset
    local agents_list=""
    local pipelines_list=""

    if [[ -f "$preset_file" ]]; then
        # Extract agents (lines between "active:" and "pipelines:")
        agents_list=$(sed -n '/^    active:/,/^    pipelines:/{ /^    active:/d; /^    pipelines:/d; s/^.*- //p; }' "$preset_file" | sed 's/ *#.*//')
        # Extract pipelines
        pipelines_list=$(sed -n '/^  pipelines:/,/^[^ ]/{ /^  pipelines:/d; /^[^ ]/d; s/^.*- //p; }' "$preset_file" | sed 's/ *#.*//')
    fi

    # Format stacks as YAML array
    local stacks_yaml=""
    for stack in $stacks; do
        stacks_yaml="${stacks_yaml}    - ${stack}\n"
    done

    # Format agents as YAML array
    local agents_yaml=""
    while IFS= read -r agent; do
        [[ -n "$agent" ]] && agents_yaml="${agents_yaml}    - ${agent}\n"
    done <<< "$agents_list"

    # Format pipelines as YAML array
    local pipelines_yaml=""
    while IFS= read -r pipeline; do
        [[ -n "$pipeline" ]] && pipelines_yaml="${pipelines_yaml}    - ${pipeline}\n"
    done <<< "$pipelines_list"

    cat > "$output_file" << YAML
# ============================================================
# Mugiwara Project Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Preset: ${preset_name}
# ============================================================
version: 2
preset: ${preset_name}
project:
  name: ${project_name}
  detected_stack:
$(echo -e "$stacks_yaml")
agents:
  active:
$(echo -e "$agents_yaml")  pipelines:
$(echo -e "$pipelines_yaml")
settings:
  auto_route_only: true
  direct_invoke_all: true
YAML

    echo "$output_file"
}

# ─── CLAUDE.md Generation ───

generate_claude_md_section() {
    local project_dir="$1"
    local preset_name="$2"
    local config_file="$project_dir/.mugiwara/project.yaml"
    local claude_md="$project_dir/CLAUDE.md"
    local today
    today=$(date -u +"%Y-%m-%d")

    # Build agents table from config
    local agents_table=""
    if [[ -f "$config_file" ]]; then
        local agents
        agents=$(sed -n '/^  active:/,/^  pipelines:/{ /^  active:/d; /^  pipelines:/d; s/^.*- //p; }' "$config_file" | sed 's/ *#.*//')

        while IFS= read -r agent; do
            [[ -z "$agent" ]] && continue
            local agent_trim
            agent_trim=$(echo "$agent" | tr -d '[:space:]')
            # Determine type
            local agent_type="skill"
            case "$agent_trim" in
                chopper|franky|nami|jinbe|robin|zorro|sanji|luffy|brook|usopp|vivi)
                    agent_type="[S]"
                    ;;
            esac
            agents_table="${agents_table}| ${agent_trim} | ${agent_type} |\n"
        done <<< "$agents"
    fi

    # Build pipelines list
    local pipelines_list=""
    if [[ -f "$config_file" ]]; then
        local pipelines
        pipelines=$(sed -n '/^  pipelines:/,/^[a-z]/{ /^  pipelines:/d; /^[a-z]/d; s/^.*- //p; }' "$config_file" | sed 's/ *#.*//')
        while IFS= read -r pipeline; do
            [[ -z "$pipeline" ]] && continue
            local pipeline_trim
            pipeline_trim=$(echo "$pipeline" | tr -d '[:space:]')
            pipelines_list="${pipelines_list}- \`/${pipeline_trim}\`\n"
        done <<< "$pipelines"
    fi

    local section
    section=$(cat << SECTION
<!-- mugiwara-config:start v2 preset=${preset_name} updated=${today} -->
## Mugiwara Agents

**Pour TOUTE demande d'ingenierie logicielle**, utilise le skill \`one_piece\` (via l'outil Skill) qui routera automatiquement vers le bon agent specialise.

### Invocation directe
Si l'utilisateur nomme un agent (ex: \`/chopper\`, \`/franky\`), invoque directement ce skill sans passer par one_piece.

### Agents actifs pour ce projet
| Agent | Type |
|-------|------|
$(echo -e "$agents_table")
### Pipelines disponibles
$(echo -e "$pipelines_list")
### Subagents eleves [S]
chopper, franky, nami, jinbe, robin, zorro, sanji, luffy, brook, usopp, vivi
Ces agents peuvent etre invoques via l'outil Agent pour tourner dans leur propre contexte.
<!-- mugiwara-config:end -->
SECTION
)

    # Check if CLAUDE.md exists and has markers
    if [[ -f "$claude_md" ]]; then
        if grep -q "mugiwara-config:start" "$claude_md"; then
            # Replace existing section between markers
            local tmp_file
            tmp_file=$(mktemp)
            awk '
                /<!-- mugiwara-config:start/ { skip=1; next }
                /<!-- mugiwara-config:end -->/ { skip=0; next }
                !skip { print }
            ' "$claude_md" > "$tmp_file"

            # Insert new section at the beginning
            echo "$section" > "$claude_md.new"
            echo "" >> "$claude_md.new"
            cat "$tmp_file" >> "$claude_md.new"
            mv "$claude_md.new" "$claude_md"
            rm -f "$tmp_file"
        else
            # Prepend to existing CLAUDE.md
            local existing
            existing=$(cat "$claude_md")
            echo "$section" > "$claude_md"
            echo "" >> "$claude_md"
            echo "$existing" >> "$claude_md"
        fi
    else
        # Create new CLAUDE.md
        echo "$section" > "$claude_md"
    fi

    echo "$claude_md"
}

# ─── Project Commands ───

project_add_agent() {
    local project_dir="$1"
    local agent_name="$2"
    local config_file="$project_dir/.mugiwara/project.yaml"

    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}[!] No .mugiwara/project.yaml found. Run init first.${NC}"
        return 1
    fi

    # Check if agent already active
    if grep -q "    - ${agent_name}" "$config_file"; then
        echo -e "${YELLOW}[~] ${agent_name} is already active.${NC}"
        return 0
    fi

    # Add agent after the "active:" line
    sed -i "/^  active:/a\\    - ${agent_name}" "$config_file"
    echo -e "${GREEN}[+] Added ${agent_name} to active agents.${NC}"
}

project_remove_agent() {
    local project_dir="$1"
    local agent_name="$2"
    local config_file="$project_dir/.mugiwara/project.yaml"

    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}[!] No .mugiwara/project.yaml found. Run init first.${NC}"
        return 1
    fi

    sed -i "/^    - ${agent_name}$/d" "$config_file"
    echo -e "${GREEN}[-] Removed ${agent_name} from active agents.${NC}"
}

project_list_agents() {
    local project_dir="$1"
    local config_file="$project_dir/.mugiwara/project.yaml"

    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}[!] No .mugiwara/project.yaml found. Run init first.${NC}"
        return 1
    fi

    echo -e "${BLUE}Active agents:${NC}"
    sed -n '/^  active:/,/^  pipelines:/{ /^  active:/d; /^  pipelines:/d; s/^.*- //p; }' "$config_file" | sed 's/ *#.*//'

    echo ""
    echo -e "${BLUE}Active pipelines:${NC}"
    sed -n '/^  pipelines:/,/^[a-z]/{ /^  pipelines:/d; /^[a-z]/d; s/^.*- //p; }' "$config_file" | sed 's/ *#.*//'
}
