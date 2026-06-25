import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DocumentUploadField, fileIdentity } from "./document-upload-field"

function makeFile(name: string, content = "content") {
  return new File([content], name, { type: "application/pdf" })
}

function makeDistinctFiles(name: string): [File, File] {
  return [makeFile(name, "alpha"), makeFile(name, "beta")]
}

describe("DocumentUploadField", () => {
  it("renders label and drop zone copy", () => {
    render(
      <DocumentUploadField
        id="moa"
        label="Memorandum of Agreement"
        files={[]}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText("Memorandum of Agreement")).toBeInTheDocument()
    expect(screen.getByText(/click to upload or drag files here/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /memorandum of agreement/i })).toBeInTheDocument()
  })

  it("shows existing server filenames", () => {
    render(
      <DocumentUploadField
        id="moa"
        label="Memorandum of Agreement"
        files={[]}
        existingNames={["signed-moa.pdf"]}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/on record: signed-moa\.pdf/i)).toBeInTheDocument()
  })

  it("adds multiple files by default", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DocumentUploadField
        id="supporting"
        label="Supporting project documents"
        files={[]}
        onChange={onChange}
      />
    )

    const input = screen.getByTestId("document-upload-input-supporting")
    await user.upload(input, [makeFile("a.pdf"), makeFile("b.pdf")])

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: "a.pdf" }),
      expect.objectContaining({ name: "b.pdf" }),
    ])
  })

  it("replaces the file in single-file mode", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DocumentUploadField
        id="moa"
        label="Memorandum of Agreement"
        multiple={false}
        files={[makeFile("old.pdf")]}
        onChange={onChange}
      />
    )

    const input = screen.getByTestId("document-upload-input-moa")
    await user.upload(input, makeFile("new.pdf"))

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: "new.pdf" })])
  })

  it("removes only the targeted file when names collide", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const [first, second] = makeDistinctFiles("dup.pdf")

    render(
      <DocumentUploadField
        id="supporting"
        label="Supporting project documents"
        multiple
        files={[first, second]}
        onChange={onChange}
      />
    )

    const removeButtons = screen.getAllByRole("button", { name: /remove dup\.pdf/i })
    await user.click(removeButtons[0]!)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: "dup.pdf", size: second.size }),
    ])
    expect(fileIdentity(first)).not.toBe(fileIdentity(second))
  })

  it("shows a limit message when too many files are added", async () => {
    const user = userEvent.setup()

    render(
      <DocumentUploadField
        id="supporting"
        label="Supporting project documents"
        multiple
        maxFiles={2}
        files={[makeFile("one.pdf")]}
        onChange={vi.fn()}
      />
    )

    const input = screen.getByTestId("document-upload-input-supporting")
    await user.upload(input, [makeFile("two.pdf"), makeFile("three.pdf")])

    expect(screen.getByText(/only 2 files allowed/i)).toBeInTheDocument()
  })
})
