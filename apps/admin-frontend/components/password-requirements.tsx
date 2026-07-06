import { PASSWORD_REQUIREMENTS_TEXT } from "@workspace/pocketbase/domain/password-policy"
import { FieldDescription } from "@workspace/ui/components/field"

export function PasswordRequirements() {
  return (
    <FieldDescription data-testid="password-requirements">
      {PASSWORD_REQUIREMENTS_TEXT}
    </FieldDescription>
  )
}
