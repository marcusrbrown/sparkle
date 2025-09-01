// Export all Form components for individual imports
// Import components for compound export
import {Form as FormRoot} from './Form'
import {FormControl} from './FormControl'
import {FormDescription} from './FormDescription'
import {FormField} from './FormField'
import {FormInput} from './FormInput'
import {FormLabel} from './FormLabel'
import {FormMessage} from './FormMessage'
import {FormPassword} from './FormPassword'
import {FormSelect, FormSelectItem} from './FormSelect'
import {FormSubmit} from './FormSubmit'
import {FormTextarea} from './FormTextarea'

export * from './Form'
export * from './FormControl'
export * from './FormDescription'
export * from './FormField'
export * from './FormInput'
export * from './FormLabel'
export * from './FormMessage'
export * from './FormPassword'
export * from './FormSelect'
export * from './FormSubmit'
export * from './FormTextarea'

// Create compound component export following architectural pattern
export const Form = Object.assign(FormRoot, {
  Root: FormRoot,
  Field: FormField,
  Label: FormLabel,
  Control: FormControl,
  Input: FormInput,
  Password: FormPassword,
  Message: FormMessage,
  Description: FormDescription,
  Textarea: FormTextarea,
  Select: FormSelect,
  SelectItem: FormSelectItem,
  Submit: FormSubmit,
})

// Individual component exports for backward compatibility
export {
  FormControl,
  FormDescription,
  FormField,
  FormInput,
  FormLabel,
  FormMessage,
  FormPassword,
  FormSelect,
  FormSelectItem,
  FormSubmit,
  FormTextarea,
}
