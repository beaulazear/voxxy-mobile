import { logger } from '../utils/logger';

// Basic profanity list - expand as needed
const profanityList = [
    // Severe profanity
    'f**k', 'f*ck', 'fck', 'fuk',
    's**t', 'sh*t', 'sht',
    'b***h', 'b*tch', 'btch',
    'a**', 'a*s',
    'd**n', 'd*mn',
    'h*ll',
    
    // Slurs and hate speech (partial list - should be expanded)
    'n***r', 'n**ga', 'n*gga',
    'f****t', 'f*g',
    'r****d',
    
    // Sexual content
    'd**k', 'd*ck',
    'p***y', 'p*ssy',
    'c**k', 'c*ck',
    
    // Add more as needed
];

// Create regex patterns for each word
const profanityPatterns = profanityList.map(word => {
    // Escape special regex characters and replace * with .
    const pattern = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.');
    return new RegExp(`\\b${pattern}\\b`, 'gi');
});

class ContentFilterService {
    /**
     * Check if text contains profanity
     * @param {string} text - Text to check
     * @returns {boolean} - True if profanity detected
     */
    containsProfanity(text) {
        if (!text || typeof text !== 'string') return false;
        
        const lowerText = text.toLowerCase();
        
        // Check against profanity patterns
        for (const pattern of profanityPatterns) {
            if (pattern.test(lowerText)) {
                logger.debug('Profanity detected in text');
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Clean profanity from text by replacing with asterisks
     * @param {string} text - Text to clean
     * @returns {string} - Cleaned text
     */
    cleanText(text) {
        if (!text || typeof text !== 'string') return text;
        
        let cleanedText = text;
        
        for (const pattern of profanityPatterns) {
            cleanedText = cleanedText.replace(pattern, (match) => {
                // Replace with asterisks keeping first letter
                return match[0] + '*'.repeat(match.length - 1);
            });
        }
        
        return cleanedText;
    }
    
    /**
     * Check if text contains spam patterns
     * @param {string} text - Text to check
     * @returns {boolean} - True if spam patterns detected
     */
    isSpam(text) {
        if (!text || typeof text !== 'string') return false;
        
        const spamPatterns = [
            /bit\.ly/gi,
            /tinyurl/gi,
            /click here/gi,
            /buy now/gi,
            /limited offer/gi,
            /act now/gi,
            /₹\d+/g,  // Currency spam
            /\$\d+/g,  // Currency spam
            /💰{3,}/g, // Excessive money emojis
            /(.)\1{10,}/g, // Excessive character repetition
            /[A-Z]{10,}/g, // Excessive caps
        ];
        
        for (const pattern of spamPatterns) {
            if (pattern.test(text)) {
                logger.debug('Spam pattern detected in text');
                return true;
            }
        }
        
        // Check for excessive URLs
        const urlPattern = /https?:\/\//gi;
        const urlMatches = text.match(urlPattern);
        if (urlMatches && urlMatches.length > 2) {
            logger.debug('Excessive URLs detected');
            return true;
        }
        
        return false;
    }
    
    /**
     * Validate comment before posting
     * @param {string} text - Comment text
     * @returns {object} - Validation result
     */
    validateComment(text) {
        if (!text || !text.trim()) {
            return {
                isValid: false,
                reason: 'Comment cannot be empty'
            };
        }
        
        if (text.length > 500) {
            return {
                isValid: false,
                reason: 'Comment is too long (max 500 characters)'
            };
        }
        
        if (this.containsProfanity(text)) {
            return {
                isValid: false,
                reason: 'Your comment contains inappropriate language. Please revise and try again.'
            };
        }
        
        if (this.isSpam(text)) {
            return {
                isValid: false,
                reason: 'Your comment appears to contain spam or promotional content.'
            };
        }
        
        return {
            isValid: true,
            cleanedText: this.cleanText(text)
        };
    }
}

export default new ContentFilterService();