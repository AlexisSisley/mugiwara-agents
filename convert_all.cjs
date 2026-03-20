const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_DIR = 'C:\\Users\\alexis.bourdon\\Documents\\Projet\\mugiwara-agents\\skills';
const OUTPUT_DIR = 'C:\\Users\\alexis.bourdon\\Documents\\Projet\\mugiwara-agents\\dist-gemini';
const SCRIPTS_DIR = 'C:\\Users\\alexis.bourdon\\AppData\\Roaming\\npm\\node_modules\\@google\\gemini-cli\\node_modules\\@google\\gemini-cli-core\\dist\\src\\skills\\builtin\\skill-creator\\scripts';

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function convertAgent(agentName) {
  console.log(`\n--- Processing agent: ${agentName} ---`);
  try {
    const sourceSkillPath = path.join(SOURCE_DIR, agentName, 'SKILL.md');
    if (!fs.existsSync(sourceSkillPath)) {
      console.error(`❌ SKILL.md not found for ${agentName}`);
      return;
    }

    const newSkillName = `mugiwara-${agentName}`.replace(/_/g, '-');
    const newSkillPath = path.join(OUTPUT_DIR, newSkillName);

    // 1. Initialize skill
    console.log(`Initializing ${newSkillName}...`);
    const initRes = spawnSync('node', [path.join(SCRIPTS_DIR, 'init_skill.cjs'), newSkillName, '--path', OUTPUT_DIR], { encoding: 'utf8' });
    if (initRes.status !== 0) {
        // If it already exists, it's fine for this script
        if (initRes.stderr && initRes.stderr.includes('already exists')) {
            console.log(`Skill ${newSkillName} already exists, continuing...`);
        } else {
            console.error(`❌ Initialization failed: ${initRes.stderr}`);
            return;
        }
    }

    // 2. Read and parse original SKILL.md
    const content = fs.readFileSync(sourceSkillPath, 'utf8');
    const parts = content.split('---');
    if (parts.length < 3) {
      console.error(`❌ Invalid SKILL.md format for ${agentName}`);
      return;
    }
    
    const yaml = parts[1];
    const body = parts.slice(2).join('---').trim();

    // Extract description from YAML
    const descMatch = yaml.match(/description:\s*>?(.*(?:\n\s+.*)*)/);
    let description = 'TODO: Add description';
    if (descMatch) {
      description = descMatch[1].trim().replace(/\n\s+/g, ' ').replace(/"/g, "'");
    }

    // 3. Create new SKILL.md
    console.log(`Writing new SKILL.md...`);
    const newSkillMd = `---
name: ${newSkillName}
description: "${description}"
---

${body}
`;
    fs.writeFileSync(path.join(newSkillPath, 'SKILL.md'), newSkillMd);

    // 4. Remove boilerplate
    console.log(`Removing boilerplate...`);
    ['scripts', 'references', 'assets'].forEach(dir => {
      const dirPath = path.join(newSkillPath, dir);
      if (fs.existsSync(dirPath)) {
        try {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            fs.unlinkSync(path.join(dirPath, file));
          }
          // Also remove the directory itself to satisfy packaging validation
          fs.rmdirSync(dirPath);
        } catch (e) {
          // Ignore if it fails
        }
      }
    });

    // 5. Package skill
    console.log(`Packaging ${newSkillName}...`);
    const packageRes = spawnSync('node', [path.join(SCRIPTS_DIR, 'package_skill.cjs'), newSkillPath, OUTPUT_DIR], { encoding: 'utf8' });
    if (packageRes.status !== 0) {
      console.error(`❌ Packaging failed: ${packageRes.stderr}`);
      return;
    }

    // 6. Install skill
    console.log(`Installing ${newSkillName}...`);
    // Use npx to ensure gemini is found in the path
    const installRes = spawnSync('npx.cmd', ['gemini', 'skills', 'install', path.join(OUTPUT_DIR, `${newSkillName}.skill`), '--scope', 'user', '--consent'], { encoding: 'utf8' });
    if (installRes.status !== 0) {
      console.error(`❌ Installation failed: ${installRes.stderr}`);
      return;
    }

    console.log(`✅ ${newSkillName} successfully installed!`);
  } catch (err) {
    console.error(`❌ Error processing ${agentName}: ${err.message}`);
  }
}

const agents = fs.readdirSync(SOURCE_DIR).filter(f => fs.statSync(path.join(SOURCE_DIR, f)).isDirectory());

for (const agent of agents) {
  convertAgent(agent);
}

console.log('\n--- Conversion Summary ---');
// Re-check installed skills if needed, but the console output will show success/fail
