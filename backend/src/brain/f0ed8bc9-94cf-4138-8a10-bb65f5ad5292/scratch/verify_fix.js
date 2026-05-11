const { generateTestReport } = require('../../../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

async function testNormalization() {
    console.log('Testing generateTestReport normalization...');
    
    // Mock project params with a JSON string for automationResults
    const mockParams = {
        projectId: 999,
        offerUrl: 'https://example.com',
        projectName: 'Test Project',
        automationResults: JSON.stringify([
            {
                card_number: '1234',
                url: 'https://example.com/thank-you',
                screenshot: 'dummy_path.png',
                landing_page_screenshot: 'dummy_landing.png',
                checkout_page_screenshot: 'dummy_checkout.png'
            }
        ])
    };

    try {
        // We expect it to NOT fail with "map is not a function"
        // It might fail later because dummy paths don't exist, but that's fine for this test
        await generateTestReport(mockParams);
    } catch (e) {
        if (e.message.includes('map is not a function')) {
            console.error('Normalization FAILED: map is not a function');
            process.exit(1);
        } else {
            console.log('Normalization passed the map check. (Caught expected subsequent error: ' + e.message + ')');
        }
    }
}

testNormalization();
