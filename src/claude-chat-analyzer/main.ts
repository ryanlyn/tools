import './styles.css'
import type { ClaudeExport, ChatMessage, ParsedMessage } from './types'

// DOM elements
const dropZone = document.getElementById('drop-zone') as HTMLDivElement
const fileInput = document.getElementById('file-input') as HTMLInputElement
const usernameInput = document.getElementById('username') as HTMLInputElement
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const preview = document.getElementById('preview') as HTMLDivElement
const stats = document.getElementById('stats') as HTMLDivElement
const status = document.getElementById('status') as HTMLDivElement

// State
let parsedMessages: ParsedMessage[] = []

// LocalStorage keys
const USERNAME_KEY = 'claude-chat-analyzer-username'

// Initialize
function init() {
  // Restore username from localStorage
  const savedUsername = localStorage.getItem(USERNAME_KEY)
  if (savedUsername) {
    usernameInput.value = savedUsername
  }

  // Save username on change
  usernameInput.addEventListener('input', () => {
    localStorage.setItem(USERNAME_KEY, usernameInput.value)
    if (parsedMessages.length > 0) {
      renderPreview()
    }
  })

  // File drop handling
  dropZone.addEventListener('click', () => fileInput.click())

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragover')
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover')
  })

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragover')
    const files = e.dataTransfer?.files
    if (files?.length) {
      handleFile(files[0])
    }
  })

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      handleFile(fileInput.files[0])
    }
  })

  // Button handlers
  copyBtn.addEventListener('click', copyAsMarkdown)
  clearBtn.addEventListener('click', clearAll)
}

// Handle file upload
async function handleFile(file: File) {
  if (!file.name.endsWith('.json')) {
    showStatus('Please select a JSON file', 'error')
    return
  }

  try {
    const text = await file.text()
    const data = JSON.parse(text) as ClaudeExport

    if (!data.chat_messages || !Array.isArray(data.chat_messages)) {
      showStatus('Invalid Claude export format', 'error')
      return
    }

    parsedMessages = parseMessages(data.chat_messages)
    renderPreview()
    renderStats(data)

    copyBtn.disabled = false
    clearBtn.disabled = false
    showStatus(`Loaded ${parsedMessages.length} messages`, 'success')

  } catch (err) {
    showStatus(`Error parsing file: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
  }
}

// Parse messages, filtering out tool calls
function parseMessages(messages: ChatMessage[]): ParsedMessage[] {
  const result: ParsedMessage[] = []

  for (const msg of messages) {
    // Extract text content, skip tool_use and tool_result
    const textParts: string[] = []

    for (const block of msg.content) {
      if (block.type === 'text' && block.text) {
        textParts.push(block.text)
      }
    }

    // Also check the top-level text field
    if (msg.text) {
      textParts.push(msg.text)
    }

    const text = textParts.join('\n').trim()

    // Only include messages with actual text content
    if (text) {
      result.push({
        sender: msg.sender,
        text,
        timestamp: msg.created_at
      })
    }
  }

  return result
}

// Get display name for sender
function getSenderName(sender: 'human' | 'assistant'): string {
  if (sender === 'human') {
    return usernameInput.value.trim() || 'User'
  }
  return 'Claude'
}

// Render preview
function renderPreview() {
  const html = parsedMessages.map(msg => {
    const name = getSenderName(msg.sender)
    const escapedText = escapeHtml(msg.text)
    return `<blockquote class="${msg.sender}"><strong>${name}:</strong> ${escapedText}</blockquote>`
  }).join('\n')

  preview.innerHTML = html
  preview.classList.add('visible')
}

// Render stats
function renderStats(data: ClaudeExport) {
  const messageCount = parsedMessages.length
  const created = new Date(data.created_at).toLocaleDateString()
  const updated = new Date(data.updated_at).toLocaleDateString()

  stats.innerHTML = `
    <strong>${messageCount}</strong> messages |
    Created: ${created} |
    Updated: ${updated}
  `
  stats.classList.add('visible')
}

// Copy as markdown
async function copyAsMarkdown() {
  const markdown = parsedMessages.map(msg => {
    const name = getSenderName(msg.sender)
    return `> **${name}**: ${msg.text}`
  }).join('\n\n')

  try {
    await navigator.clipboard.writeText(markdown)
    showStatus('Copied to clipboard!', 'success')
  } catch {
    showStatus('Failed to copy to clipboard', 'error')
  }
}

// Clear all
function clearAll() {
  parsedMessages = []
  preview.innerHTML = ''
  preview.classList.remove('visible')
  stats.innerHTML = ''
  stats.classList.remove('visible')
  copyBtn.disabled = true
  clearBtn.disabled = true
  fileInput.value = ''
  hideStatus()
}

// Status helpers
function showStatus(message: string, type: 'info' | 'success' | 'error') {
  status.textContent = message
  status.className = `status ${type}`
}

function hideStatus() {
  status.className = 'status'
  status.textContent = ''
}

// Escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}

// Start
init()
