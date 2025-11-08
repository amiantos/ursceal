/**
 * Macro Processor Service
 * Handles SillyTavern-style macro replacement in text
 */

export class MacroProcessor {
  constructor(context = {}) {
    this.context = {
      userName: context.userName || 'User',
      charName: context.charName || 'Character',
      ...context
    };
  }

  /**
   * Process all macros in text
   * @param {string} text - Text containing macros
   * @returns {string} - Text with macros replaced
   */
  process(text) {
    if (!text) return text;

    let result = text;

    // Single-pass evaluation (no nesting support, like SillyTavern)
    // Process macros in order of complexity (simple → complex)

    // 1. Context macros ({{user}}, {{char}})
    result = this.processContextMacros(result);

    // 2. Random/Pick macros ({{random:...}}, {{pick:...}})
    result = this.processSelectionMacros(result);

    // 3. Dice roll macros ({{roll:d6}})
    result = this.processDiceRolls(result);

    return result;
  }

  /**
   * Process context macros ({{user}}, {{char}})
   */
  processContextMacros(text) {
    let result = text;

    // Replace {{user}} with user name (case insensitive)
    result = result.replace(/\{\{user\}\}/gi, this.context.userName);

    // Replace {{char}} and {{character}} with character name (case insensitive)
    result = result.replace(/\{\{char\}\}/gi, this.context.charName);
    result = result.replace(/\{\{character\}\}/gi, this.context.charName);

    return result;
  }

  /**
   * Process selection macros ({{random:...}}, {{pick:...}})
   * Supports both single colon ({{random:a,b,c}}) and double colon ({{random::a::b::c}})
   */
  processSelectionMacros(text) {
    let result = text;

    // Match {{random:...}} or {{random::...}} or {{pick:...}} or {{pick::...}}
    // Regex: {{(random|pick)(::?)([^}]+)}}
    const macroRegex = /\{\{(random|pick)(::?)([^}]+)\}\}/gi;

    result = result.replace(macroRegex, (match, macroName, delimiter, args) => {
      try {
        // Parse arguments based on delimiter
        let options;

        if (delimiter === '::') {
          // Double colon: split by '::'
          options = args.split('::').map(opt => opt.trim()).filter(opt => opt);
        } else {
          // Single colon: split by ',' but handle escaped commas
          options = this.splitByComma(args).map(opt => opt.trim()).filter(opt => opt);
        }

        if (options.length === 0) {
          return match; // Return original if no valid options
        }

        // For {{random}}: random selection
        // For {{pick}}: stable selection (we'll use first for MVP, can add state tracking later)
        if (macroName.toLowerCase() === 'random') {
          const randomIndex = Math.floor(Math.random() * options.length);
          return options[randomIndex];
        } else if (macroName.toLowerCase() === 'pick') {
          // For pick, we use consistent hash-based selection (stable for same input)
          const hash = this.simpleHash(match);
          const index = Math.abs(hash) % options.length;
          return options[index];
        }

        return match;
      } catch (error) {
        console.error('Failed to process selection macro:', error);
        return match; // Return original on error
      }
    });

    return result;
  }

  /**
   * Split by comma, respecting escaped commas (\,)
   */
  splitByComma(text) {
    const parts = [];
    let current = '';
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '\\' && !escaped) {
        escaped = true;
        continue;
      }

      if (char === ',' && !escaped) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }

      escaped = false;
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Simple hash function for stable {{pick}} selection
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Process dice roll macros ({{roll:d6}}, {{roll:2d20+5}})
   */
  processDiceRolls(text) {
    let result = text;

    // Match {{roll:XdY+Z}} or {{roll:dY}} patterns
    // Format: {{roll:2d6+3}}, {{roll:d20}}, {{roll:3d8-2}}
    const diceRegex = /\{\{roll:((\d*)d(\d+)([+-]\d+)?)\}\}/gi;

    result = result.replace(diceRegex, (match, fullRoll, numDice, diceSize, modifier) => {
      try {
        const count = parseInt(numDice) || 1;
        const size = parseInt(diceSize);
        const mod = modifier ? parseInt(modifier) : 0;

        if (isNaN(size) || size <= 0 || count <= 0 || count > 100) {
          return match; // Return original if invalid
        }

        // Roll dice
        let total = 0;
        for (let i = 0; i < count; i++) {
          total += Math.floor(Math.random() * size) + 1;
        }

        total += mod;

        return total.toString();
      } catch (error) {
        console.error('Failed to process dice roll:', error);
        return match;
      }
    });

    return result;
  }
}
