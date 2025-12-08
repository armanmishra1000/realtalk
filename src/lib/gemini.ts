const MODEL = 'models/gemini-2.0-flash-exp';

export async function translateText(text: string, targetLanguage: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [{
        text: `Translate the following text to ${targetLanguage}. Return only the translated text.\n\n"${text}"`
      }]
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    return 'Translation failed';
  } catch (error) {
    console.error('Translation error', error);
    return 'Error translating';
  }
}
