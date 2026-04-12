import { describe, it, expect } from 'vitest';
import { validateCardBody, validateCardTitle } from '../../src/core/validation.js';
import { InvalidContentError } from '../../src/core/errors.js';

describe('validation', () => {
  describe('validateCardBody', () => {
    it('accepts empty body', () => {
      expect(() => validateCardBody('')).not.toThrow();
    });

    it('accepts normal text', () => {
      expect(() => validateCardBody('Just some text')).not.toThrow();
    });

    it('accepts ### headings', () => {
      expect(() => validateCardBody('### Subheading')).not.toThrow();
    });

    it('accepts #### headings', () => {
      expect(() => validateCardBody('#### Deep')).not.toThrow();
    });

    it('rejects # at line start', () => {
      expect(() => validateCardBody('# Column-like')).toThrow(InvalidContentError);
    });

    it('rejects ## at line start', () => {
      expect(() => validateCardBody('## Card-like')).toThrow(InvalidContentError);
    });

    it('rejects # in middle of multi-line body', () => {
      expect(() => validateCardBody('Line one\n# Bad line\nLine three')).toThrow(InvalidContentError);
    });

    it('rejects kanban-settings fence', () => {
      expect(() => validateCardBody('```kanban-settings')).toThrow(InvalidContentError);
    });

    it('rejects card-settings fence', () => {
      expect(() => validateCardBody('```card-settings')).toThrow(InvalidContentError);
    });

    it('rejects stack-settings fence', () => {
      expect(() => validateCardBody('```stack-settings')).toThrow(InvalidContentError);
    });

    it('allows normal code fences', () => {
      expect(() => validateCardBody('```javascript\nconsole.log("hi")\n```')).not.toThrow();
    });
  });

  describe('validateCardTitle', () => {
    it('accepts normal title', () => {
      expect(() => validateCardTitle('My Card')).not.toThrow();
    });

    it('rejects empty title', () => {
      expect(() => validateCardTitle('')).toThrow(InvalidContentError);
    });

    it('rejects title with newlines', () => {
      expect(() => validateCardTitle('Line 1\nLine 2')).toThrow(InvalidContentError);
    });
  });
});
