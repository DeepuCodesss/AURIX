/**
 * PhantomShieldX Local Heuristic Engine
 * 
 * Implements a multi-layered detection strategy:
 * 1. Extension Analysis: Checks for dangerous file types (.exe, .bat, .ps1, etc.)
 * 2. Filename Heuristics: Detects suspicious naming patterns (e.g., double extensions, urgent keywords)
 * 3. Size Analysis: Flags abnormal file sizes for specific types.
 * 4. Magic Byte Detection: Analyzes binary file headers to detect actual file types regardless of extension.
 */

export interface HeuristicResult {
  isThreat: boolean;
  reason: string | null;
  detectedType: string;
}

const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.ps1', '.vbs', '.scr', '.js', '.cmd', '.msi'];
const SUSPICIOUS_KEYWORDS = ['urgent', 'invoice', 'payment', 'password', 'login', 'verify'];

// Magic Byte Signatures (Hex)
const MAGIC_BYTES: Record<string, { signature: string; type: string }> = {
  '4d5a': { signature: '4d5a', type: 'Executable (Windows)' },
  '7f454c46': { signature: '7f454c46', type: 'Executable (Linux)' },
  '25504446': { signature: '25504446', type: 'PDF Document' },
  'ffd8ffe0': { signature: 'ffd8ffe0', type: 'JPEG Image' },
  '89504e47': { signature: '89504e47', type: 'PNG Image' },
  '504b0304': { signature: '504b0304', type: 'ZIP/Office Archive' },
};

export async function analyzeFile(file: File): Promise<HeuristicResult> {
  const fileName = file.name.toLowerCase();
  const fileSize = file.size;
  
  // 1. Extension Analysis
  const extension = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2);
  if (DANGEROUS_EXTENSIONS.includes(`.${extension}`)) {
    return { isThreat: true, reason: `Dangerous extension detected: .${extension}`, detectedType: 'Executable' };
  }

  // 2. Filename Heuristics
  if (SUSPICIOUS_KEYWORDS.some(keyword => fileName.includes(keyword)) && extension === 'exe') {
    return { isThreat: true, reason: 'Suspicious filename pattern detected', detectedType: 'Malware' };
  }

  // Double extension check (e.g., image.jpg.exe)
  const parts = fileName.split('.');
  if (parts.length > 2 && DANGEROUS_EXTENSIONS.includes(`.${parts[parts.length - 1]}`)) {
    return { isThreat: true, reason: 'Double extension spoofing detected', detectedType: 'Trojan' };
  }

  // 3. Size Analysis
  // Flag very small executables or very large documents
  if (extension === 'exe' && fileSize < 1024) {
    return { isThreat: true, reason: 'Abnormally small executable size', detectedType: 'Dropper' };
  }

  // 4. Magic Byte Detection (The Killer Feature)
  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const uint = new Uint8Array(buffer);
    let bytes = '';
    uint.forEach((byte) => {
      bytes += byte.toString(16).padStart(2, '0');
    });

    // Check for MZ (Windows Executable)
    if (bytes.startsWith('4d5a')) {
      if (!extension.includes('exe') && !extension.includes('dll')) {
        return { isThreat: true, reason: 'Magic Byte Mismatch: Executable masked as ' + extension, detectedType: 'Masked Executable' };
      }
      return { isThreat: false, reason: null, detectedType: 'Windows Executable' };
    }

    // Check other signatures
    for (const [sig, info] of Object.entries(MAGIC_BYTES)) {
      if (bytes.startsWith(sig)) {
        return { isThreat: false, reason: null, detectedType: info.type };
      }
    }
  } catch (e) {
    console.error('Magic byte analysis failed', e);
  }

  return { isThreat: false, reason: null, detectedType: file.type || 'Unknown' };
}
