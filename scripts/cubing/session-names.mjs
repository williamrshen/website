const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }

export function decodeSessionName(name) {
  return String(name).replace(/&(?:amp|lt|gt|quot|#39);/g, entity => entities[entity]).trim()
}

export function sessionNameKey(name) {
  return decodeSessionName(name).toLowerCase().replaceAll('×', 'x')
}
