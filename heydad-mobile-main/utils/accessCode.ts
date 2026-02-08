const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const generateChildAccessCode = (length = 6): string => {
  let result = "";
  const alphabetLength = ALPHABET.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * alphabetLength);
    result += ALPHABET[randomIndex];
  }

  return result;
};

export const normalizeAccessCode = (code: string) => code?.trim().toUpperCase() || "";
