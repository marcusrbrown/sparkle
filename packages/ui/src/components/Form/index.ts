// Export all Form components for individual imports
export * from './Form'
export * from './FormField'
export * from './FormLabel'
export * from './FormControl'
export * from './FormMessage'
export * from './FormTextarea'
export * from './FormSelect'
export * from './FormSubmit'

// Import components for compound export
import {Form as FormRoot} from './Form'
import {FormField} from './FormField'
import {FormLabel} from './FormLabel'
import {FormControl} from './FormControl'
import {FormMessage} from './FormMessage'
import {FormTextarea} from './FormTextarea'
import {FormSelect, FormSelectItem} from './FormSelect'
import {FormSubmit} from './FormSubmit'

// Create compound component export following architectural pattern
export const Form = Object.assign(FormRoot, {
  Root: FormRoot,
  Field: FormField,
  Label: FormLabel,
  Control: FormControl,
  Message: FormMessage,
  Textarea: FormTextarea,
  Select: FormSelect,
  SelectItem: FormSelectItem,
  Submit: FormSubmit,
})

// Individual component exports for backward compatibility
export {FormField, FormLabel, FormControl, FormMessage, FormTextarea, FormSelect, FormSelectItem, FormSubmit}
