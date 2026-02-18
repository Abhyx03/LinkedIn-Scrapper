
const API_KEY = "Your Gemini API Key";

async function testModel(modelName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    console.log(`Testing ${modelName}...`);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        if (response.ok) {
            console.log(`SUCCESS: ${modelName} works!`);
            return true;
        } else {
            console.log(`FAILED: ${modelName} - ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log(text.substring(0, 200)); // Print first 200 chars of error
            return false;
        }
    } catch (e) {
        console.log(`ERROR: ${modelName} - ${e.message}`);
        return false;
    }
}

async function run() {
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.5-pro-001",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    for (const model of models) {
        if (await testModel(model)) break;
    }
}

run();
