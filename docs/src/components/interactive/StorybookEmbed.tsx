import React, {useEffect, useState} from 'react'

/**
 * Props for the StorybookEmbed component
 */
export interface StorybookEmbedProps {
  /** The Storybook story ID (e.g., 'components-button--primary') */
  storyId: string
  /** Base URL for the Storybook instance, defaults to localhost:6006 for development */
  storybookUrl?: string
  /** Height of the iframe in pixels, defaults to 400 */
  height?: number
  /** Width of the iframe, defaults to '100%' */
  width?: string | number
  /** Whether to show the toolbar in the embedded story, defaults to false */
  showToolbar?: boolean
  /** Whether to show the panel (docs, controls, etc.), defaults to false */
  showPanel?: boolean
  /** Additional CSS classes for the iframe container */
  className?: string
  /** Title for accessibility (screen readers) */
  title?: string
  /** Loading state placeholder */
  loadingPlaceholder?: React.ReactNode
}

/**
 * Component that embeds a Storybook story in an iframe for documentation purposes.
 *
 * This component provides a seamless way to display interactive Storybook stories
 * within the Astro Starlight documentation site. It automatically handles the
 * iframe URL construction, loading states, and responsive behavior.
 *
 * @example
 * ```tsx
 * // Embed a Button story
 * <StorybookEmbed
 *   storyId="components-button--primary"
 *   title="Primary Button Story"
 *   height={300}
 * />
 *
 * // Embed with toolbar and controls
 * <StorybookEmbed
 *   storyId="components-form--default"
 *   showToolbar={true}
 *   showPanel={true}
 *   height={500}
 * />
 * ```
 */
export function StorybookEmbed({
  storyId,
  storybookUrl = 'http://localhost:6006',
  height = 400,
  width = '100%',
  showToolbar = false,
  showPanel = false,
  className = '',
  title,
  loadingPlaceholder,
}: StorybookEmbedProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Construct the iframe URL with proper parameters
  const iframeUrl = React.useMemo(() => {
    const url = new URL(`/iframe.html`, storybookUrl)
    url.searchParams.set('id', storyId)
    url.searchParams.set('viewMode', 'story')

    // Hide toolbar and panel by default for cleaner embed
    if (!showToolbar) {
      url.searchParams.set('nav', '0')
    }
    if (!showPanel) {
      url.searchParams.set('panel', '0')
    }

    return url.toString()
  }, [storyId, storybookUrl, showToolbar, showPanel])

  // Generate accessible title if not provided
  const accessibleTitle = title || `Storybook story: ${storyId.replaceAll('--', ' - ').replaceAll('-', ' ')}`

  // Handle iframe load events
  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // Reset loading state when story changes
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [storyId])

  // Default loading placeholder
  const defaultLoadingPlaceholder = (
    <div
      style={{
        height: `${height}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666',
      }}
    >
      Loading Storybook story...
    </div>
  )

  // Error state
  if (hasError) {
    return (
      <div
        style={{
          height: `${height}px`,
          width: typeof width === 'number' ? `${width}px` : width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff5f5',
          border: '1px solid #fed7d7',
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '14px',
          color: '#e53e3e',
        }}
        className={className}
      >
        <div style={{marginBottom: '0.5rem', fontWeight: '600'}}>Failed to load Storybook story</div>
        <div style={{fontSize: '12px', color: '#666', textAlign: 'center'}}>
          Story ID: {storyId}
          <br />
          Make sure Storybook is running and the story exists.
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`,
      }}
      className={className}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1}}>
          {loadingPlaceholder || defaultLoadingPlaceholder}
        </div>
      )}

      {/* Storybook iframe */}
      <iframe
        src={iframeUrl}
        width={width}
        height={height}
        title={accessibleTitle}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        loading="lazy"
      />
    </div>
  )
}
