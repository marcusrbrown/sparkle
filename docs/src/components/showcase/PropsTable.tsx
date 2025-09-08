import React from 'react'

/**
 * Interface for describing a component prop - matches the structure from JSDoc extraction
 */
export interface PropDocumentation {
  /** Property name */
  name: string
  /** TypeScript type */
  type: string
  /** Whether the prop is required */
  required: boolean
  /** Default value if any */
  defaultValue?: string
  /** JSDoc description */
  description?: string
}

/**
 * Props for the PropsTable component
 */
export interface PropsTableProps {
  /**
   * Array of prop definitions to display
   */
  props: PropDocumentation[]
  /**
   * Optional title for the props table
   */
  title?: string
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * PropsTable component for displaying component prop documentation
 *
 * Renders a comprehensive table showing prop names, types, descriptions,
 * required status, and default values for TypeScript component interfaces.
 */
export const PropsTable: React.FC<PropsTableProps> = ({props, title = 'Props', className = ''}) => {
  if (!props || props.length === 0) {
    return (
      <div className={`props-table-empty ${className}`}>
        <p className="text-gray-500 text-sm italic">No props documented for this component.</p>
      </div>
    )
  }

  return (
    <div className={`props-table-container ${className}`}>
      <h3 className="props-table-title">{title}</h3>
      <div className="props-table-wrapper">
        <table className="props-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Required</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {props.map(prop => (
              <tr key={prop.name}>
                <td className="prop-name">
                  <code>{prop.name}</code>
                </td>
                <td className="prop-type">
                  <code className="type-code">{prop.type}</code>
                </td>
                <td className="prop-required">
                  {prop.required ? (
                    <span className="required-badge">Required</span>
                  ) : (
                    <span className="optional-badge">Optional</span>
                  )}
                </td>
                <td className="prop-default">
                  {prop.defaultValue ? (
                    <code className="default-code">{prop.defaultValue}</code>
                  ) : (
                    <span className="no-default">—</span>
                  )}
                </td>
                <td className="prop-description">{prop.description || <span className="no-description">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Utility function to create PropDocumentation from TypeScript interface
 * This is a helper for manual prop definition creation
 */
export const createPropDefinition = (
  name: string,
  type: string,
  options: {
    description?: string
    required?: boolean
    defaultValue?: string
  } = {},
): PropDocumentation => ({
  name,
  type,
  description: options.description,
  required: options.required ?? false,
  defaultValue: options.defaultValue,
})

/**
 * Pre-defined common prop types for easy reuse
 */
export const CommonPropTypes = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  FUNCTION: '() => void',
  REACT_NODE: 'React.ReactNode',
  CSS_CLASS: 'string',
  HTML_ATTRIBUTES: 'HTMLAttributes<HTMLElement>',
} as const
