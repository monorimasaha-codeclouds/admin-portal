const { runAutomation } = require('./src/utils/automation');
const db = require('./src/config/db');

async function testProject(projectId) {
    try {
        console.log(`Fetching project ${projectId}...`);
        const [projects] = await db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
        if (projects.length === 0) {
            console.log('Project not found');
            process.exit(1);
        }
        const project = projects[0];

        const [links] = await db.execute('SELECT * FROM project_links WHERE project_id = ?', [projectId]);
        const [cards] = await db.execute('SELECT * FROM project_cards WHERE project_id = ?', [projectId]);

        project.links = links;
        project.cards = cards;

        console.log(`Starting automation for project: ${project.project_name}`);
        const results = await runAutomation(project, cards);
        
        console.log('\n--- Automation Results ---');
        console.log(JSON.stringify(results, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testProject(21);
