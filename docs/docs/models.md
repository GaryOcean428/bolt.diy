```json
{
  "thoughts": [
    "We will present a unified table with all columns: Name, API Model Name, Provider, Parameters, Context Window, Max Output, Release Date, Key Strengths, Model Card Link, and Docs Link.",
    "We’ll keep Granite 3.1 Dense 2B as the local default model, but also preserve the details of all listed models."
  ],
  "tool_name": "no_tool_used",
  "tool_args": {},
  "next_steps": [
    "Provide a final consolidated models.md with the updated table",
    "Ensure we keep the local model configuration referencing Granite 3.1 Dense 2B"
  ],
  "additional_info": {
    "explanations": [
      "This includes the newly provided Qwen2.5-Coder-32B-Instruct and llama3-groq-70b-8192-tool-use-preview models"
    ],
    "resources": [
      "https://docs.x.ai/docs/overview",
      "https://platform.openai.com/docs/models#current-model-aliases"
    ]
  }
}
```

---

## **Consolidated Models Document (Complete Table)**

Below is the updated `models.md` with the new table of models (including Qwen2.5-Coder-32B-Instruct and llama3-groq-70b-8192-tool-use-preview). **Granite 3.1 Dense 2B** remains the default local model.

---

### **1. Allowed Models Only**

Use the table below to reference the **exact** naming conventions, parameters, context limits, release date, and key strengths. **Any other models or older versions are disallowed**.

Name API Model Name Provider Parameters Context Window Max Output Release Date Key Strengths Model Card Link Docs Link
Granite 3.1 Dense 2B granite3.1-dense:2b IBM/Ollama 2.53B 8K 4K Dec 18, 2024 Tool-based tasks, RAG, code generation, multilingual support Granite 3.1 Dense 2B | <https://huggingface.co/ibm-granite/granite-3.1-2b-instruct> <https://www.ibm.com/granite/docs/>
GPT-4o chatgpt-4o-latest OpenAI Not disclosed 128K 16,384 2024-11 Versatile flagship model with text/image input GPT-4o Model Card <https://platform.openai.com/docs/models#current-model-aliases>
GPT-4o-mini gpt-4o-mini OpenAI Not disclosed 128K 16,384 2024-07 Fast, affordable for focused tasks GPT-4o-mini Card Models - OpenAI API
o1 o1 OpenAI Not disclosed 200K 100K 2024-12 Complex reasoning capabilities o1 Model Card <https://platform.openai.com/docs/models#current-model-aliases>
o1-mini o1-mini OpenAI Not disclosed 128K 65,536 2024-09 Fast reasoning for specialized tasks o1-mini Model Card <https://platform.openai.com/docs/models#current-model-aliases>
gpt-4o-realtime-preview gpt-4o-realtime-preview OpenAI Not disclosed 128K 4096  These models are capable of responding to audio and text inputs in realtime over WebRTC or a WebSocket interface. <https://platform.openai.com/docs/models#gpt-4o-realtime> <https://platform.openai.com/docs/quickstart>
Qwen2.5-Coder-32B-Instruct Qwen2.5-Coder-32B-Instruct Qwen 32.5B 32,768 Not specified 2024-11 Strong in math/coding, experimental research <https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct> 
Llama-3.3-70b-versatile llama-3.3-70b-versatile Groq 70B 128K 32,768 Current Versatile large language model Llama 3.3 Card <https://console.groq.com/docs/models>
Claude 3.5 Sonnet claude-3-5-sonnet-latest Anthropic Not disclosed 200K Not specified 2024-04 Most intelligent model, text/image input Claude 3.5 Sonnet <https://docs.anthropic.com/en/docs/about-claude/models>
Claude 3.5 Haiku claude-3-5-haiku-latest Anthropic Not disclosed 200K Not specified 2024-07 Fastest Claude 3.5 model Claude 3.5 Haiku <https://docs.anthropic.com/en/docs/about-claude/models>
Sonar Small llama-3.1-sonar-small-128k-online Perplexity 8B 127,072 Not specified Current Fast online search capabilities Sonar Small <https://docs.perplexity.ai/guides/getting-started>
Sonar Large llama-3.1-sonar-large-128k-online Perplexity 70B 127,072 Not specified Current Advanced reasoning with integrated search Sonar Large <https://docs.perplexity.ai/guides/getting-started>
Sonar Huge llama-3.1-sonar-huge-128k-online Perplexity 405B 127,072 Not specified Current Most powerful search-augmented model Sonar Huge <https://docs.perplexity.ai/guides/getting-started>
grok-beta grok-beta xAI Not disclosed 131,072 Not specified Beta Large context window for text (Beta) Grok Beta <https://docs.x.ai/docs/overview>
grok-vision-beta grok-vision-beta xAI Not disclosed 8,192 Not specified Beta Image-to-text generation (Beta) Grok Vision Beta <https://docs.x.ai/docs/overview>
grok-2-latest grok-2-latest xAI Not disclosed 131,072 Not specified Current Large context window for text, updated generation Grok 2-latest <https://docs.x.ai/docs/overview>
grok-2-vision-1212 grok-2-vision-1212 xAI Not disclosed 32,768 Not specified Current Vision tasks with text output Grok 2-vision-1212 <https://docs.x.ai/docs/overview>
llama3-groq-70b-8192-tool-use-preview llama3-groq-70b-8192-tool-use-preview groq 70B 8192 Not specified Preview Tool Use <https://huggingface.co/Groq/Llama-3-Groq-70B-Tool-Use> <https://console.groq.com/docs/models>
---

### **2. Local Model Configuration**

The **default local model** for **development** and **production** is **Granite 3.1 Dense 2B**. This model offers:

- Optimized for tool-based use cases and RAG applications  
- Efficient code generation and debugging capabilities  
- Support for 12 languages including English, German, Spanish, French, Japanese  
- Trained on over 12 trillion tokens of data  
- Apache 2.0 license for commercial use  
- Quantized to Q4_K_M for optimal performance (~1.5GB)  
- Knowledge Cutoff Date: April 2024  

---

### **3. Model Installation**

To install this local model:
```bash
ollama run granite3.1-dense:2b
```

---

### **4. Capabilities (Granite 3.1 Dense 2B)**

- Summarization  
- Text classification  
- Text extraction  
- Question-answering  
- Retrieval Augmented Generation (RAG)  
- Code-related tasks  
- Function-calling tasks  
- Multilingual dialog use cases  
- Long-context tasks (document/meeting summarization, document QA)

---

### **5. Model Parameters**

Default parameters for optimal performance:
- **Temperature**: 0.7  
- **Max Tokens**: 4096  
- **Top P**: 0.9  
- **Frequency Penalty**: 0.0  
- **Presence Penalty**: 0.0  

---

### **6. Additional Information**

- **Developer**: IBM Research  
- **GitHub**: ibm-granite/granite-language-models  
- **Documentation**: Granite Docs  
- **License**: Apache 2.0  
- **Size**: ~1.5GB (Quantized Q4_K_M)  
- **System Context**: Knowledge Cutoff Date: April 2024  

---

### **7. Key Differences: Claude 3.5 Sonnet vs. Claude 3.5 Haiku**

- **Claude 3.5 Sonnet**  
  - Higher reasoning benchmarks (MMLU, HumanEval)  
  - Multimodal features (beta)  
  - More expensive; excels at complex tasks with better accuracy  

- **Claude 3.5 Haiku**  
  - Faster inference speed  
  - Lower cost per million tokens  
  - Excellent for quick prototypes and lighter tasks  

---

### **8. Best Practices**

1. **Model Selection**  
   - Default to **Granite 3.1 Dense 2B** for local inference  
   - Switch to a specialized model only if needed (e.g., GPT-4o for multimodal input)  
   - Use **Sonar** series for **search-augmented** tasks  
   - Consider **Grok** models for large context or image/text tasks as needed  

2. **Versioning**  
   - Use `:latest` for dev/testing  
   - Lock to specific date-stamped versions for production  
   - Periodically review release notes for updates  

3. **Context Window Management**  
   - Monitor token usage carefully (especially for 128K+ contexts)  
   - Implement chunking or summarization if input is too large  

4. **Fallback & Error Handling**  
   - Have a fallback model (e.g., `llama-3.3-70b-versatile`) configured  via api fallback.
   - Log errors and fallback triggers  
   - Use partial streaming for large outputs  

5. **Security**  
   - Strictly validate user inputs  
   - Rate-limit API calls  
   - Monitor resource usage to avoid denial-of-service  

---

### **9. Implementation Snippet**

```typescript
// Example environment configuration
const config = {
  // Granite 3.1 Dense 2B as the default local model
  defaultLocalModel: "granite3.1-dense:2b",

  fallbackModel: "llama-3.3-70b-versatile",

  // Full set of available models
  availableModels: [
    "chatgpt-4o-latest",         // GPT-4o
    "gpt-4o-mini",    // GPT-4o-mini
    "o1",             // o1
    "o1-mini",        // o1-mini
    "Qwen2.5-Coder-32B-Instruct",
    "llama-3.3-70b-versatile",
    "claude-3-5-sonnet-v2@20241022",
    "claude-3-5-haiku@20241022",
    "llama-3.1-sonar-small-128k-online",
    "llama-3.1-sonar-large-128k-online",
    "llama-3.1-sonar-huge-128k-online",
    "grok-beta",
    "grok-vision-beta",
    "grok-2-latest",
    "grok-2-vision-1212",
    "llama3-groq-70b-8192-tool-use-preview",
    "granite3.1-dense:2b" // included for completeness
  ]
};

// Utility to select a model, defaulting to local Granite 3.1 Dense 2B
function getModel(modelName?: string) {
  if (!modelName || !config.availableModels.includes(modelName)) {
    return config.defaultLocalModel;
  }
  return modelName;
}

// Usage
async function generateResponse(prompt: string, chosenModel?: string) {
  const model = getModel(chosenModel);
  // Implementation details for calling the appropriate endpoint/runtime
  return /* ...call model inference... */;
}
```

---

### **10. Final Notes**

- **Older or unlisted models** are prohibited to avoid confusion or legacy behavior  
- Always **log model usage** for traceability and debugging  
- For specialized tasks not covered by the above list, consult your team lead before adding new models  

**This completes the updated `models.md` document with the new table and Granite 3.1 Dense 2B as the default local model.**

Gemini Developer API
Get a Gemini API Key
Get a Gemini API key and make your first API request in minutes.

https://ai.google.dev/gemini-api/docs/models/gemini#gemini-2.0-flash

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("YOUR_API_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt = "Explain how AI works";

const result = await model.generateContent(prompt);
console.log(result.response.text());

Model details
Property	Description
Model code	models/gemini-2.0-flash-exp
Supported data types
Inputs

Audio, images, video, and text

Output

Audio (coming soon), images (coming soon), and text

Token limits[*]
Input token limit

1,048,576

Output token limit

8,192

Rate limits[**]
10 RPM
4 million TPM
1,500 RPD
Capabilities
Structured outputs

Supported

Caching

Not supported

Tuning

Not supported

Function calling

Supported

Code execution

Supported

Search

Supported

Image generation

Supported

Native tool use

Supported

Audio generation

Supported

Multimodal Live API

Supported

Versions	
Read the model version patterns for more details.
Latest: gemini-2.0-flash-exp
Latest update	December 2024
Knowledge cutoff	August 2024