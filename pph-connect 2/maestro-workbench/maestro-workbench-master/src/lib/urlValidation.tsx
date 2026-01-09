/**
 * URL validation utilities for preventing XSS attacks
 */

import React from 'react';

export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
}

/**
 * Validates and sanitizes URLs to prevent XSS attacks
 */
export class UrlValidator {
  private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];
  private static readonly DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'];
  
  /**
   * Basic URL validation - checks format and dangerous protocols
   */
  static validateBasicUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL is required' };
    }

    try {
      const parsedUrl = new URL(url);

      // Check for dangerous protocols
      if (UrlValidator.DANGEROUS_PROTOCOLS.includes(parsedUrl.protocol.toLowerCase())) {
        return { isValid: false, error: 'Dangerous protocol not allowed' };
      }
      
      // Only allow HTTP/HTTPS
      if (!UrlValidator.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
      }
      
      // Check for suspicious characters in URL
      if (UrlValidator.containsSuspiciousCharacters(url)) {
        return { isValid: false, error: 'URL contains suspicious characters' };
      }
      
      return { isValid: true, sanitizedUrl: parsedUrl.toString() };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Validates Google Docs URLs specifically
   */
  static validateGoogleDocsUrl(url: string): ValidationResult {
    const basicValidation = UrlValidator.validateBasicUrl(url);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    try {
      const parsedUrl = new URL(url);
      
      // Must be docs.google.com domain
      if (!parsedUrl.hostname.includes('docs.google.com')) {
        return { isValid: false, error: 'Only Google Docs URLs are allowed' };
      }
      
      return { isValid: true, sanitizedUrl: parsedUrl.toString() };
    } catch (error) {
      return { isValid: false, error: 'Invalid Google Docs URL' };
    }
  }

  /**
   * Validates PDF URLs - allows any HTTPS URL
   */
  static validatePdfUrl(url: string): ValidationResult {
    const basicValidation = UrlValidator.validateBasicUrl(url);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    try {
      const parsedUrl = new URL(url);
      
      // Prefer HTTPS for PDFs
      if (parsedUrl.protocol !== 'https:') {
        return { isValid: false, error: 'PDF URLs must use HTTPS protocol' };
      }
      
      return { isValid: true, sanitizedUrl: parsedUrl.toString() };
    } catch (error) {
      return { isValid: false, error: 'Invalid PDF URL' };
    }
  }

  /**
   * Validates YouTube URLs and extracts video ID for embedding
   */
  static validateYouTubeUrl(url: string): ValidationResult {
    const basicValidation = UrlValidator.validateBasicUrl(url);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    try {
      const parsedUrl = new URL(url);
      
      // Only allow YouTube domains
      if (!parsedUrl.hostname.includes('youtube.com') && parsedUrl.hostname !== 'youtu.be') {
        return { isValid: false, error: 'Only YouTube URLs are allowed' };
      }
      
      let videoId: string | null = null;
      
      if (parsedUrl.hostname === 'youtu.be') {
        // Short URL format: https://youtu.be/VIDEO_ID
        videoId = parsedUrl.pathname.replace('/', '');
      } else if (parsedUrl.hostname.includes('youtube.com')) {
        // Standard URL format: https://www.youtube.com/watch?v=VIDEO_ID
        videoId = parsedUrl.searchParams.get('v');
        
        // Handle embed URLs
        if (!videoId && parsedUrl.pathname.includes('/embed/')) {
          videoId = parsedUrl.pathname.split('/embed/')[1];
        }
      }
      
      if (!videoId || !UrlValidator.isValidVideoId(videoId)) {
        return { isValid: false, error: 'Could not extract valid YouTube video ID' };
      }
      
      // Return clean embed URL
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return { isValid: true, sanitizedUrl: embedUrl };
    } catch (error) {
      return { isValid: false, error: 'Invalid YouTube URL' };
    }
  }

  /**
   * Checks if a string contains suspicious characters that could be used for XSS
   */
  private static containsSuspiciousCharacters(url: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+\s*=/i, // onclick, onload, etc.
      /<script/i,
      /<\/script/i,
      /<iframe/i,
      /<\/iframe/i,
      /<object/i,
      /<\/object/i,
      /<embed/i,
      /<\/embed/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Validates YouTube video ID format
   */
  private static isValidVideoId(videoId: string): boolean {
    // YouTube video IDs are typically 11 characters, alphanumeric + hyphens + underscores
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}

/**
 * Safe link component props
 */
export interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  validator?: (url: string) => ValidationResult;
}

/**
 * Safe link component that validates URLs before rendering
 */
export const SafeLink: React.FC<SafeLinkProps> = ({ 
  href, 
  children, 
  className, 
  target = '_blank', 
  rel = 'noopener noreferrer',
  validator = UrlValidator.validateBasicUrl
}) => {
  const validation = validator(href);
  
  if (!validation.isValid) {
    console.warn('SafeLink: Invalid URL blocked', { href, error: validation.error });
    return (
      <span className={className} title={`Invalid URL: ${validation.error}`}>
        {children}
      </span>
    );
  }
  
  return (
    <a 
      href={validation.sanitizedUrl || href}
      target={target}
      rel={rel}
      className={className}
    >
      {children}
    </a>
  );
};
