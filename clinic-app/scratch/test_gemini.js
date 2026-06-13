const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testKey() {
  const apiKey = "AIzaSyDR-5LZ-NZoHbFDgp6idmUn_49X__70A1E";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent("Hello, verify that this API key is working correctly. Reply with 'Success' if it is.");
    const response = await result.response;
    console.log("Response:", response.text());
    console.log("API Key is WORKING!");
  } catch (error) {
    console.error("API Key Test FAILED:");
    console.error(error.message);
  }
}

testKey();
