import { useI18n } from 'vue-i18n'
import * as z from 'zod'

export function useSchemas() {
  const { t } = useI18n()

  const amountSchema = z
    .string(t('amount.required.error'))
    .min(1, t('amount.required.error'))
    .regex(/^\d+(\.\d{1,2})?$/, t('amount.contents.error'))
    .transform((value) => Number(value))
    .refine((value) => value >= 0.01, t('amount.underflow.error'))
    .refine((value) => value <= 99999999.99, t('amount.overflow.error'))

  function stringSchema(requiredMessage) {
    let schema = z.string()
    if (requiredMessage) schema = schema.min(1, requiredMessage)
    return schema.regex(/^[\p{L}\p{P}\d\s+]*$/u, t('string.constraints.error'))
  }

  return { amountSchema, stringSchema }
}
