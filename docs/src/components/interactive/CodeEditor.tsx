import type * as monaco from 'monaco-editor'

import Editor, {type BeforeMount, type Monaco, type OnMount} from '@monaco-editor/react'
import {useCallback, useRef, useState} from 'react'

import {CopyButton} from './CopyButton'

/**
 * Props for the CodeEditor component
 */
export interface CodeEditorProps {
  /** Initial code content for the editor */
  defaultValue?: string
  /** Current code value (controlled component) */
  value?: string
  /** Programming language for syntax highlighting */
  language?: string
  /** Editor theme - supports 'light', 'vs-dark', or custom themes */
  theme?: 'light' | 'vs-dark' | string
  /** Height of the editor in pixels or CSS string */
  height?: number | string
  /** Width of the editor in pixels or CSS string */
  width?: number | string
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Whether to show line numbers */
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval'
  /** Whether to enable word wrap */
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
  /** Font size in pixels */
  fontSize?: number
  /** Whether to show the minimap */
  minimap?: boolean
  /** Whether to show folding controls */
  folding?: boolean
  /** Whether to enable auto-closing brackets */
  autoClosingBrackets?: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never'
  /** Whether to enable auto-indentation */
  autoIndent?: 'none' | 'keep' | 'brackets' | 'advanced' | 'full'
  /** Tab size in spaces */
  tabSize?: number
  /** Whether to use spaces for indentation */
  insertSpaces?: boolean
  /** Additional CSS classes */
  className?: string
  /** Loading placeholder component */
  loading?: React.ReactNode
  /** Callback when editor content changes */
  onChange?: (value: string | undefined, event: monaco.editor.IModelContentChangedEvent) => void
  /** Callback when editor validation changes */
  onValidate?: (markers: monaco.editor.IMarker[]) => void
  /** Callback when editor is ready to use */
  onReady?: (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => void
  /** Whether to enable TypeScript compiler options */
  enableTypeScript?: boolean
  /** Custom TypeScript compiler options */
  compilerOptions?: monaco.languages.typescript.CompilerOptions
  /** Extra TypeScript type definitions */
  extraLibs?: {content: string; filePath: string}[]
  /** Whether to show the copy button */
  showCopyButton?: boolean
  /** Position of the copy button */
  copyButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Copy button size */
  copyButtonSize?: 'sm' | 'md' | 'lg'
  /** Copy button variant */
  copyButtonVariant?: 'default' | 'outline' | 'ghost' | 'minimal'
  /** Custom title for the editor container */
  title?: string
  /** Whether to show a header with title and copy button */
  showHeader?: boolean
  /** Callback when code is copied */
  onCopy?: (success: boolean, error?: string | null) => void
}

/**
 * A powerful code editor component built on Monaco Editor with TypeScript support and copy functionality.
 *
 * This component provides a fully-featured code editing experience with syntax highlighting,
 * IntelliSense, error checking, TypeScript language services, and integrated copy-to-clipboard
 * functionality. It's designed for use in documentation sites where users need to edit and
 * interact with code examples.
 *
 * @example
 * ```tsx
 * // Basic TypeScript editor with copy button
 * <CodeEditor
 *   defaultValue="const greeting: string = 'Hello, World!';\nconsole.log(greeting);"
 *   language="typescript"
 *   height={300}
 *   enableTypeScript={true}
 *   showCopyButton={true}
 *   copyButtonPosition="top-right"
 * />
 *
 * // Editor with header and custom copy behavior
 * <CodeEditor
 *   defaultValue={complexCode}
 *   language="tsx"
 *   title="React Component Example"
 *   showHeader={true}
 *   copyButtonVariant="outline"
 *   onCopy={(success, error) => {
 *     if (success) {
 *       showToast('Code copied to clipboard!')
 *     }
 *   }}
 * />
 *
 * // React component editor with custom types
 * <CodeEditor
 *   defaultValue={`import React from 'react';
 *
 * interface Props {
 *   title: string;
 * }
 *
 * export const Component: React.FC<Props> = ({ title }) => (
 *   <h1>{title}</h1>
 * );`}
 *   language="typescript"
 *   height={400}
 *   enableTypeScript={true}
 *   extraLibs={[
 *     {
 *       content: 'declare module "react" { ... }',
 *       filePath: 'file:///node_modules/@types/react/index.d.ts'
 *     }
 *   ]}
 *   onChange={(code) => console.log('Code changed:', code)}
 *   showCopyButton={true}
 *   copyButtonPosition="bottom-right"
 * />
 * ```
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  defaultValue = '',
  value,
  language = 'typescript',
  theme = 'light',
  height = 400,
  width = '100%',
  readOnly = false,
  lineNumbers = 'on',
  wordWrap = 'on',
  fontSize = 14,
  minimap = false,
  folding = true,
  autoClosingBrackets = 'languageDefined',
  autoIndent = 'advanced',
  tabSize = 2,
  insertSpaces = true,
  className,
  loading = 'Loading editor...',
  onChange,
  onValidate,
  onReady,
  enableTypeScript = true,
  compilerOptions = {},
  extraLibs = [],
  showCopyButton = false,
  copyButtonPosition = 'top-right',
  copyButtonSize = 'sm',
  copyButtonVariant = 'outline',
  title,
  showHeader = false,
  onCopy,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const [currentValue, setCurrentValue] = useState(value || defaultValue)

  const handleEditorWillMount: BeforeMount = useCallback(
    monacoInstance => {
      monacoRef.current = monacoInstance

      if (enableTypeScript && (language === 'typescript' || language === 'javascript')) {
        // Default TypeScript compiler options optimized for code examples
        const defaultCompilerOptions = {
          target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          allowNonTsExtensions: true,
          moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
          module: monacoInstance.languages.typescript.ModuleKind.ESNext,
          noEmit: true,
          noLib: false,
          typeRoots: ['node_modules/@types'],
          allowSyntheticDefaultImports: true,
          allowImportingTsExtensions: false,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmitOnError: false,
          strict: true,
          skipLibCheck: true,
          jsx: monacoInstance.languages.typescript.JsxEmit.ReactJSX,
          ...compilerOptions,
        }

        // Configure TypeScript compiler options
        monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions(defaultCompilerOptions)
        monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions(defaultCompilerOptions)

        // Enable eager model sync for better performance
        monacoInstance.languages.typescript.typescriptDefaults.setEagerModelSync(true)
        monacoInstance.languages.typescript.javascriptDefaults.setEagerModelSync(true)

        // Add extra type definitions
        extraLibs.forEach(({content, filePath}) => {
          monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(content, filePath)
          monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(content, filePath)
        })

        // Add common React and DOM types if not provided
        if (!extraLibs.some(lib => lib.filePath.includes('@types/react'))) {
          // Add basic React types for better IntelliSense
          const reactTypes = `
declare namespace React {
  interface FC<P = {}> {
    (props: P): JSX.Element | null;
  }
  interface Component<P = {}, S = {}> {
    props: P;
    state: S;
  }
  interface HTMLAttributes<T> {
    className?: string;
    id?: string;
    style?: CSSProperties;
    onClick?: (event: MouseEvent<T>) => void;
  }
  interface CSSProperties {
    [key: string]: string | number | undefined;
  }
  interface MouseEvent<T> {
    currentTarget: T;
    preventDefault(): void;
    stopPropagation(): void;
  }
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    div: React.HTMLAttributes<HTMLDivElement>;
    span: React.HTMLAttributes<HTMLSpanElement>;
    button: React.HTMLAttributes<HTMLButtonElement>;
    input: React.HTMLAttributes<HTMLInputElement>;
    h1: React.HTMLAttributes<HTMLHeadingElement>;
    h2: React.HTMLAttributes<HTMLHeadingElement>;
    h3: React.HTMLAttributes<HTMLHeadingElement>;
    p: React.HTMLAttributes<HTMLParagraphElement>;
    [elemName: string]: any;
  }
}

declare module 'react' {
  export = React;
}
`
          monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
            reactTypes,
            'file:///node_modules/@types/react/index.d.ts',
          )
        }
      }

      // Configure editor themes if needed
      if (theme === 'vs-dark') {
        monacoInstance.editor.setTheme('vs-dark')
      } else if (theme !== 'light') {
        // Custom theme handling could be added here
        monacoInstance.editor.setTheme(theme)
      }
    },
    [enableTypeScript, language, extraLibs, compilerOptions, theme],
  )

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monacoInstance) => {
      editorRef.current = editor
      monacoRef.current = monacoInstance

      // Configure editor options
      editor.updateOptions({
        readOnly,
        lineNumbers,
        wordWrap,
        fontSize,
        minimap: {enabled: minimap},
        folding,
        autoClosingBrackets,
        autoIndent,
        tabSize,
        insertSpaces,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        roundedSelection: false,
        cursorStyle: 'line',
        smoothScrolling: true,
      })

      // Call onReady callback if provided
      onReady?.(editor, monacoInstance)
    },
    [
      readOnly,
      lineNumbers,
      wordWrap,
      fontSize,
      minimap,
      folding,
      autoClosingBrackets,
      autoIndent,
      tabSize,
      insertSpaces,
      onReady,
    ],
  )

  const handleChange = useCallback(
    (newValue: string | undefined, event: monaco.editor.IModelContentChangedEvent) => {
      setCurrentValue(newValue || '')
      onChange?.(newValue, event)
    },
    [onChange],
  )

  const handleValidate = useCallback(
    (markers: monaco.editor.IMarker[]) => {
      onValidate?.(markers)
    },
    [onValidate],
  )

  const handleCopy = (success: boolean, error?: string | null) => {
    onCopy?.(success, error)
  }

  // Get position classes for the copy button
  const getCopyButtonClasses = () => {
    const baseClasses = 'absolute z-10'

    switch (copyButtonPosition) {
      case 'top-left':
        return `${baseClasses} top-2 left-2`
      case 'top-right':
        return `${baseClasses} top-2 right-2`
      case 'bottom-left':
        return `${baseClasses} bottom-2 left-2`
      case 'bottom-right':
        return `${baseClasses} bottom-2 right-2`
      default:
        return `${baseClasses} top-2 right-2`
    }
  }

  const containerClasses = [
    'code-editor-container',
    'relative',
    'border',
    'border-gray-200',
    'dark:border-gray-700',
    'rounded-lg',
    'overflow-hidden',
    'bg-white',
    'dark:bg-gray-900',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      {showHeader && (title || showCopyButton) && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {title && <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>}
          {showCopyButton && (
            <CopyButton
              textToCopy={currentValue}
              size={copyButtonSize}
              variant={copyButtonVariant}
              onCopy={handleCopy}
              ariaLabel={`Copy ${title || 'code'} to clipboard`}
            />
          )}
        </div>
      )}

      <div className="relative">
        <Editor
          height={height}
          width={width}
          defaultLanguage={language}
          defaultValue={defaultValue}
          value={value}
          theme={theme}
          loading={loading}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          onChange={handleChange}
          onValidate={handleValidate}
          options={{
            automaticLayout: true,
            contextmenu: true,
            copyWithSyntaxHighlighting: true,
          }}
        />

        {showCopyButton && !showHeader && (
          <div className={getCopyButtonClasses()}>
            <CopyButton
              textToCopy={currentValue}
              size={copyButtonSize}
              variant={copyButtonVariant}
              onCopy={handleCopy}
              ariaLabel="Copy code to clipboard"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Default export for Astro compatibility
export default CodeEditor

// Export types for external use
export type {BeforeMount, Monaco, OnMount}
