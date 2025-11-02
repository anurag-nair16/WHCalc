// This is the secure backend function that calls OpenRouter.
// It reads the API key from your Netlify environment variables.

export default async (req) => {
    // 1. Get the API key from Netlify's environment
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: "API key is not set in Netlify environment." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 2. Get the chat text from the index.html request
        const { chatText } = await req.json();

        if (!chatText) {
            return new Response(JSON.stringify({ error: "No chat text provided." }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 3. Define the system prompt for the AI
        const systemPrompt = `You are a data extraction bot. Your ONLY task is to analyze the following WhatsApp chat and extract transactions.
        A transaction is any message indicating a payment (e.g., 'sent 50', 'paid 100', '500 rs', 'gpay 20', 'phonepe 30').
        You MUST return ONLY a valid JSON object. Do not add any text before or after the JSON.
        The JSON object must match this exact schema:
        {
          "transactions": [
            { "name": "string", "amount": number }
          ]
        }
        If no transactions are found, return:
        {
          "transactions": []
        }`;

        const apiUrl = `https://openrouter.ai/api/v1/chat/completions`;
        
        // 4. Prepare the payload for OpenRouter
        const payload = {
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
                { "role": "system", "content": systemPrompt },
                { "role": "user", "content": chatText }
            ]
        };

        // 5. Make the API call to OpenRouter
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://your-site-name.netlify.app', // Optional, but good practice
                'X-Title': 'WhatsApp Calculator' // Optional
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API error:", errorText);
            return new Response(JSON.stringify({ error: `OpenRouter API error: ${response.statusText}` }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        
        // 6. Send the AI's response back to index.html
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in Netlify function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
