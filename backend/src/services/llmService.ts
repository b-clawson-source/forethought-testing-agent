import OpenAI from 'openai';
import type { ConversationTurn } from '../../../shared/types/testing';

type GenerateResponseOutput = {
  message: string;
  shouldEndConversation: boolean;
};

export class LLMService {
  private client: OpenAI;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY missing');
    this.client = new OpenAI({ apiKey: key });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Builds the "customer" reply given the last user message, FT answer, persona, and log.
   * Your runner expects .message and .shouldEndConversation.
   */
  async generateResponse(
    lastUserMessage: string,
    forethoughtAnswer: string,
    personaType: string,
    conversationLog: ConversationTurn[]
  ): Promise<GenerateResponseOutput> {
    const sys = [
      `You simulate a real user chatting with customer support.`,
      `Persona: ${personaType}.`,
      `Be concise (1–2 sentences).`,
      `If the support answer appears complete, acknowledge and end.`,
    ].join(' ');

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: sys },
      {
        role: 'user',
        content:
          `My message: "${lastUserMessage}". Support replied: "${forethoughtAnswer}". ` +
          `Given this, respond as the persona.`,
      },
    ];

    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      messages,
    });

    const msg = res.choices[0]?.message?.content?.trim() || 'Thanks, that helps.';
    const shouldEnd =
      /thank you|that helps|resolved|goodbye|no further|all set/i.test(msg) ||
      /resolved|issue fixed|problem solved/i.test(forethoughtAnswer);

    return { message: msg, shouldEndConversation: shouldEnd };
  }

  /**
   * Your runner asks this to kick off a conversation.
   */
  async generateInitialPrompt(personaType: string, context: string): Promise<string> {
    const sys = `Generate the first user message for a ${personaType} persona. Keep it natural and short.`;
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: `Context (optional): ${context || '(none)'}` },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || 'Hi, I need help with missing points.';
  }

  /**
   * Your runner uses this to produce the next user turn when not ending.
   */
  async generateNextUserMessage(
    personaType: string,
    conversationLog: ConversationTurn[]
  ): Promise<string> {
    const last = conversationLog[conversationLog.length - 1];
    const sys = `Continue as a ${personaType} persona. 1–2 sentences, natural language.`;
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: sys },
        {
          role: 'user',
          content:
            `Last assistant reply: "${last?.forethoughtResponse}". ` +
            `Your previous message was: "${last?.userMessage}". Continue appropriately.`,
        },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || 'Could you clarify the steps?';
  }
}