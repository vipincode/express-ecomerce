import slugify from "slugify";

/**
 * Generates a URL-friendly slug from a given string.
 * Ensures consistent formatting across the app.
 *
 * @param text - The input text to convert (e.g. category name)
 * @returns A clean, lowercase, hyphenated slug string
 */
export const generateSlug = (text: string): string => {
  return slugify(text, {
    lower: true, // convert to lowercase
    strict: true, // remove special characters
    replacement: "-", // replace spaces with dashes
    trim: true, // remove leading/trailing spaces
  });
};
