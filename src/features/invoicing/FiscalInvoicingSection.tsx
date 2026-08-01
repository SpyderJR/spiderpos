import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { toast } from '../../store/useToastStore'
import { registerInvoicingIssuer, fileToBase64 } from './api'

interface FiscalInvoicingSectionProps {
  ready: boolean
  /** true si RFC/razón social/régimen/CP fiscal ya están completos —
   * requisito previo para poder subir el CSD. */
  fiscalDataComplete: boolean
}

export function FiscalInvoicingSection({ ready, fiscalDataComplete }: FiscalInvoicingSectionProps) {
  const [cerFile, setCerFile] = useState<File | null>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const cerInputRef = useRef<HTMLInputElement>(null)
  const keyInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!cerFile || !keyFile) throw new Error('Sube el .cer y el .key')
      const [cer_base64, key_base64] = await Promise.all([
        fileToBase64(cerFile),
        fileToBase64(keyFile),
      ])
      return registerInvoicingIssuer({ cer_base64, key_base64, key_password: password })
    },
    onSuccess: () => {
      toast.success('Facturación electrónica activada')
      queryClient.invalidateQueries({ queryKey: ['current-member'] })
      setCerFile(null)
      setKeyFile(null)
      setPassword('')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo activar'),
  })

  return (
    <section className="border-carbon-100 dark:border-carbon-800 dark:bg-carbon-900 flex flex-col gap-3 rounded-2xl border bg-white p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <h2 className="text-carbon-900 dark:text-paper font-semibold">Facturación electrónica</h2>
        {ready && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            ✓ Configurada
          </span>
        )}
      </div>

      {!fiscalDataComplete ? (
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Completa tu RFC, razón social, régimen fiscal y código postal fiscal arriba para poder
          activar la facturación.
        </p>
      ) : (
        <>
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">
            {ready
              ? 'Puedes volver a subir tu certificado si el actual está por vencer (el SAT los emite por 4 años).'
              : 'Sube tu Certificado de Sello Digital (CSD), el mismo que usas para facturar en el portal del SAT. Solo se hace una vez.'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <input
                ref={cerInputRef}
                type="file"
                accept=".cer"
                className="hidden"
                onChange={(e) => setCerFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => cerInputRef.current?.click()}
              >
                {cerFile ? `✓ ${cerFile.name}` : 'Subir archivo .cer'}
              </Button>
            </div>
            <div>
              <input
                ref={keyInputRef}
                type="file"
                accept=".key"
                className="hidden"
                onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => keyInputRef.current?.click()}
              >
                {keyFile ? `✓ ${keyFile.name}` : 'Subir archivo .key'}
              </Button>
            </div>
          </div>
          <input
            type="password"
            placeholder="Contraseña de la llave privada"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-2.5 text-sm"
          />
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!cerFile || !keyFile || !password}
          >
            {ready ? 'Actualizar certificado' : 'Activar facturación'}
          </Button>
        </>
      )}
    </section>
  )
}
