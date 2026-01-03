// Claude conversation export types

export interface ClaudeExport {
  uuid: string
  name: string
  created_at: string
  updated_at: string
  chat_messages: ChatMessage[]
}

export interface ChatMessage {
  uuid: string
  sender: 'human' | 'assistant'
  created_at: string
  updated_at: string
  text: string
  content: ContentBlock[]
  attachments: Attachment[]
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  name?: string
  input?: unknown
}

export interface Attachment {
  file_name: string
  file_type: string
  file_size: number
  extracted_content?: string
}

// Parsed message for display
export interface ParsedMessage {
  sender: 'human' | 'assistant'
  text: string
  timestamp: string
}
