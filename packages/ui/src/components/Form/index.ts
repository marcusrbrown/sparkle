// Export all Form components for individual imports
export * from './Form'
export * from './FormField'
export * from './FormLabel'
export * from './FormControl'
export * from './FormInput'
export * from './FormPassword'
export * from './FormMessage'
export * from './FormDescription'
export * from './FormTextarea'
export * from './FormSelect'
export * from './FormSubmit'

// Import components for compound export
import {Form as FormRoot} from './Form'
import {FormField} from './FormField'
import {FormLabel} from './FormLabel'
import {FormControl} from './FormControl'
import {FormInput} from './FormInput'
import {FormPassword} from './FormPassword'
import {FormMessage} from './FormMessage'
import {FormDescription} from './FormDescription'
import {FormTextarea} from './FormTextarea'
import {FormSelect, FormSelectItem} from './FormSelect'
import {FormSubmit} from './FormSubmit'

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
  FormField,
  FormLabel,
  FormControl,
  FormInput,
  FormPassword,
  FormMessage,
  FormDescription,
  FormTextarea,
  FormSelect,
  FormSelectItem,
  FormSubmit,
}
