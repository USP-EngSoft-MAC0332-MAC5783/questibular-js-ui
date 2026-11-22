function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export function formatQuestionMarkdown(value) {
  const placeholders = []
  const addPlaceholder = html => {
    const index = placeholders.push(html) - 1
    return `@@SAFE${index}@@`
  }

  let text = String(value ?? '')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, source) => {
      const url = safeHttpsUrl(source)
      if (!url || /\/broken-image\.svg(?:$|\?)/i.test(url)) return escapeHtml(alt)
      return addPlaceholder(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`)
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, source) => {
      const url = safeHttpsUrl(source)
      if (!url) return escapeHtml(label)
      return addPlaceholder(
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
      )
    })

  text = escapeHtml(text)
    .replace(/\\([[\]])/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\r\n?/g, '\n')
    .replace(/\n/g, '<br>')

  return text.replace(/@@SAFE(\d+)@@/g, (_, index) => placeholders[Number(index)] ?? '')
}

export function questionPreview(value) {
  return String(value ?? '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\\([[\]])/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
}
