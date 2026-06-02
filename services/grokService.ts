interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class GrokService {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';
  private model: string = 'llama-3.3-70b-versatile'; // Using Llama 3.3 via Groq

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], temperature: number = 0.7): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: temperature,
          max_tokens: 4096,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Grok');
      }

      const data: ChatResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Grok API Error:', error);
      throw error;
    }
  }

  async chatWithContext(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    systemPrompt: string = 'You are a helpful AI assistant for the OSREN Operations Manager. Help users manage their business operations, inventory, sales, and distribution efficiently.'
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    return this.chat(messages);
  }
}

// Initialize with API key from environment variable
const grokApiKey = import.meta.env.VITE_GROQ_API_KEY || '';
const grokService = new GrokService(grokApiKey);

export default grokService;
