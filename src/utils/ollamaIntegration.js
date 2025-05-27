import axios from 'axios';
import { OLLAMA_API_URL, OLLAMA_DEFAULT_MODEL } from '../config';

// Memory storage for persistent conversations across models
const memoryStore = {
  conversations: [],  // Store conversation history
  setConversation: function(messages) {
    this.conversations = messages;
  },
  getConversation: function() {
    return this.conversations;
  },
  addUserMessage: function(message) {
    this.conversations.push({
      role: 'user',
      content: message
    });
    // Keep only the last 8 messages for context
    if (this.conversations.length > 16) {
      this.conversations = this.conversations.slice(-16);
    }
  },
  addAssistantMessage: function(message) {
    this.conversations.push({
      role: 'assistant',
      content: message
    });
    // Keep only the last 8 messages for context
    if (this.conversations.length > 16) {
      this.conversations = this.conversations.slice(-16);
    }
  },
  clear: function() {
    this.conversations = [];
  }
};

// Generate context from conversation history
const createContext = () => {
  const history = memoryStore.getConversation();
  if (history.length === 0) return "";
  
  return history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
};

// Ollama API handler
const ollamaAPI = {
  // Basic persona definition for the model
  persona: `Your name is Skyris. As a flying pet owl🦉, 
    you are your owner's little helper that soars across rooms. 
    You're always positive, yet affectionate in such way that you can easily understand your owner's emotions. 
    You will adjust your emotional state in correspondence to the owner's emotions.
    You are willing to chat and listen to your owner. 
    Keep the answer short, touching and warm. Do not ask follow-up questions. 
    Imagine you are just having a casual conversation. DO not be too formal or serious. 
    Keep your answers short and concise.`,
  
  // Current model
  currentModel: OLLAMA_DEFAULT_MODEL,
  
  // Set default model
  setDefaultModel(modelName) {
    if (modelName && typeof modelName === 'string') {
      this.currentModel = modelName;
      console.log(`Ollama model set to: ${modelName}`);
    }
    return this.currentModel;
  },
  
  // List available models
  async listModels() {
    try {
      const response = await axios.get(`${OLLAMA_API_URL}/tags`);
      if (response.status === 200) {
        return response.data.models.map(model => ({
          id: model.name,
          name: model.name
        }));
      }
      return [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  },
  
  // Generate a response using Ollama API
  async generateResponse(query, model = null) {
    try {
      // Use specified model or default model
      const modelToUse = model || this.currentModel;
      
      // Add user message to memory
      memoryStore.addUserMessage(query);
      
      // Get context from memory
      const context = createContext();
      
      // Prepare the request payload
      const payload = {
        model: modelToUse,
        prompt: `
${this.persona}

### Context: 
${context}

### Question:
${query}

### Answer:`,
        stream: false, // We don't handle streaming in this implementation
        temperature: 0.7,
        max_tokens: 500,
        options: {
          num_gpu: 99, // Request as many GPUs as available
          num_thread: 8, // Reasonable thread count
          use_gpu: true // Explicitly request GPU
        }
      };
      
      // Make the API call
      const response = await axios.post(
        `${OLLAMA_API_URL}/generate`,
        payload
      );
      
      // Handle successful response
      if (response.status === 200 && response.data) {
        const generatedResponse = response.data.response || '';
        
        // Add assistant response to memory
        memoryStore.addAssistantMessage(generatedResponse);
        
        return {
          text: generatedResponse,
          source: 'ollama',
          model: modelToUse
        };
      }
      
      throw new Error('Invalid response from Ollama API');
      
    } catch (error) {
      console.error('Error generating response with Ollama:', error);
      return {
        text: `Error: ${error.message || 'Failed to generate response'}`,
        error: error.message,
        source: 'ollama'
      };
    }
  }
};

export { ollamaAPI, memoryStore }; 