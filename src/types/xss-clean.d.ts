declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  
  interface XssCleanOptions {
    /** List of allowed HTML tags (default: []) */
    allowedTags?: string[];
    /** List of allowed HTML attributes (default: []) */
    allowedAttributes?: { [key: string]: string[] };
    /** Whether to allow comments (default: false) */
    allowComments?: boolean;
  }

  function xssClean(options?: XssCleanOptions): RequestHandler;
  
  export = xssClean;
}
