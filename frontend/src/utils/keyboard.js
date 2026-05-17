export const ARABIC_TO_ENGLISH_MAP = {
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']',
  'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l', 'ك': ';', 'ط': '\'',
  'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm', 'و': ',', 'ز': '.', 'ظ': '/',
  'ذ': '`', 'أ': 'h', 'إ': 'y', 'آ': 'n'
};

export const mapArabicToEnglishKeyboard = (str) => {
  if (!str) return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += ARABIC_TO_ENGLISH_MAP[char] || char;
  }
  return result;
};