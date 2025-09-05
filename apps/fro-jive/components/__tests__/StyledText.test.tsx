// TODO: Switch to @testing-library/react-native once RN testing is properly configured
import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {MonoText} from '../StyledText'

describe('MonoText', () => {
  it('renders text content', () => {
    const testText = 'Test Text'
    render(<MonoText>{testText}</MonoText>)
    expect(screen.getByText(testText)).toBeInTheDocument()
  })
})
