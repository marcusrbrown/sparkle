import React from 'react'
import type {Meta, StoryObj} from '@storybook/react'

const Welcome = () => {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Sparkle Storybook</h1>
      <p className="text-lg mb-4">
        This is your central hub for developing and documenting UI components across all Sparkle packages.
      </p>
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Browse components using the sidebar</li>
          <li>View documentation and props in the Controls panel</li>
          <li>Test interactions in the Canvas</li>
          <li>View source code and implementation details</li>
        </ul>
      </div>
    </div>
  )
}

const meta = {
  title: 'Welcome',
  component: Welcome,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Welcome>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
