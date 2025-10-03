import React, {useEffect, useRef, useState} from 'react'

/**
 * Standard viewport configurations for responsive testing
 */
export interface ViewportConfig {
  /** Viewport identifier */
  name: string
  /** Display label */
  label: string
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Device category icon */
  icon?: string
  /** Device category for styling */
  category: 'mobile' | 'tablet' | 'desktop'
}

/**
 * Predefined viewport sizes matching Sparkle design system breakpoints
 * and visual regression testing standards
 */
export const VIEWPORTS: Record<string, ViewportConfig> = {
  mobile: {
    name: 'mobile',
    label: 'Mobile',
    width: 375,
    height: 667,
    icon: '📱',
    category: 'mobile',
  },
  tablet: {
    name: 'tablet',
    label: 'Tablet',
    width: 768,
    height: 1024,
    icon: '📱',
    category: 'tablet',
  },
  desktop: {
    name: 'desktop',
    label: 'Desktop',
    width: 1280,
    height: 720,
    icon: '🖥️',
    category: 'desktop',
  },
  desktopLarge: {
    name: 'desktopLarge',
    label: 'Desktop Large',
    width: 1920,
    height: 1080,
    icon: '🖥️',
    category: 'desktop',
  },
} as const

/**
 * Props for the ResponsivePreview component
 */
export interface ResponsivePreviewProps {
  /**
   * Content to preview at different viewport sizes
   * Can be React components or HTML content
   */
  children: React.ReactNode
  /**
   * Initial viewport to display
   * @default 'desktop'
   */
  initialViewport?: keyof typeof VIEWPORTS
  /**
   * Whether to show viewport controls
   * @default true
   */
  showControls?: boolean
  /**
   * Whether to show dimension labels
   * @default true
   */
  showDimensions?: boolean
  /**
   * Whether to show device frame around preview
   * @default true
   */
  showFrame?: boolean
  /**
   * Custom title for the preview section
   */
  title?: string
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Whether to scale content to fit container
   * @default false
   */
  scaleToFit?: boolean
}

/**
 * Responsive preview component for testing components at different viewport sizes
 *
 * Displays component content in an isolated container that simulates different
 * device viewport sizes. Provides interactive controls to switch between mobile,
 * tablet, and desktop viewports.
 *
 * @example
 * ```tsx
 * <ResponsivePreview initialViewport="mobile">
 *   <Button>Test Button</Button>
 * </ResponsivePreview>
 * ```
 */
export const ResponsivePreview: React.FC<ResponsivePreviewProps> = ({
  children,
  initialViewport = 'desktop',
  showControls = true,
  showDimensions = true,
  showFrame = true,
  title,
  className = '',
  scaleToFit = false,
}) => {
  const [activeViewport, setActiveViewport] = useState<keyof typeof VIEWPORTS>(initialViewport)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const viewport = VIEWPORTS[activeViewport]
  if (!viewport) {
    throw new Error(`Invalid viewport: ${activeViewport}`)
  }

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleViewportChange = (viewportName: keyof typeof VIEWPORTS) => {
    setActiveViewport(viewportName)
  }

  const scale =
    scaleToFit && containerWidth > 0 && viewport.width > containerWidth ? containerWidth / viewport.width : 1

  const previewStyle: React.CSSProperties = {
    width: `${viewport.width}px`,
    minHeight: `${viewport.height}px`,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: 'top left',
  }

  return (
    <div className={`responsive-preview-wrapper ${className}`} ref={containerRef}>
      {/* Header with controls */}
      {(showControls || title) && (
        <div className="responsive-preview-header">
          {title && <h3 className="responsive-preview-title">{title}</h3>}
          {showControls && (
            <div className="responsive-preview-controls">
              {Object.values(VIEWPORTS).map(vp => (
                <button
                  key={vp.name}
                  className={`viewport-button ${activeViewport === vp.name ? 'active' : ''} ${vp.category}`}
                  onClick={() => handleViewportChange(vp.name as keyof typeof VIEWPORTS)}
                  aria-label={`Switch to ${vp.label} viewport`}
                  aria-pressed={activeViewport === vp.name}
                  title={`${vp.label} (${vp.width}×${vp.height})`}
                >
                  <span className="viewport-icon" aria-hidden="true">
                    {vp.icon}
                  </span>
                  <span className="viewport-label">{vp.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dimension display */}
      {showDimensions && (
        <div className="responsive-preview-dimensions">
          <span className="dimension-label">
            {viewport.width} × {viewport.height} px
            {scale !== 1 && ` (scaled to ${Math.round(scale * 100)}%)`}
          </span>
        </div>
      )}

      {/* Preview container */}
      <div className={`responsive-preview-container ${showFrame ? 'with-frame' : ''}`}>
        <div className={`responsive-preview-content ${viewport.category}`} ref={previewRef} style={previewStyle}>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Multi-viewport preview showing content at multiple viewport sizes simultaneously
 *
 * Useful for comparing how components render across different screen sizes.
 *
 * @example
 * ```tsx
 * <MultiViewportPreview>
 *   <Button>Responsive Button</Button>
 * </MultiViewportPreview>
 * ```
 */
export interface MultiViewportPreviewProps {
  /** Content to preview */
  children: React.ReactNode
  /** Viewports to display */
  viewports?: (keyof typeof VIEWPORTS)[]
  /** Show dimension labels */
  showDimensions?: boolean
  /** Additional CSS classes */
  className?: string
}

export const MultiViewportPreview: React.FC<MultiViewportPreviewProps> = ({
  children,
  viewports = ['mobile', 'tablet', 'desktop'],
  showDimensions = true,
  className = '',
}) => {
  return (
    <div className={`multi-viewport-preview ${className}`}>
      {viewports.map(viewportName => {
        const viewport = VIEWPORTS[viewportName]
        if (!viewport) {
          return null
        }
        return (
          <div key={viewportName} className="multi-viewport-item">
            <div className="multi-viewport-header">
              <span className="viewport-icon" aria-hidden="true">
                {viewport.icon}
              </span>
              <span className="viewport-name">{viewport.label}</span>
              {showDimensions && (
                <span className="viewport-dimensions">
                  {viewport.width} × {viewport.height}
                </span>
              )}
            </div>
            <div
              className={`multi-viewport-content ${viewport.category}`}
              style={{
                width: `${viewport.width}px`,
                minHeight: `${viewport.height}px`,
              }}
            >
              {children}
            </div>
          </div>
        )
      })}
    </div>
  )
}
