'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function InfoPage() {
  const router = useRouter()
  const { user } = useAuth()
  const domain = typeof window !== 'undefined' ? window.location.hostname : 'lovisa-bottles.com'

  const handleContinue = () => {
    if (user) {
      router.push('/')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="space-y-4 text-white/80 font-mono text-sm sm:text-base leading-relaxed">
          <p>
            {domain} är en sida för dig lovisa och lite för mig olof
          </p>
          <p>
            en gång om dagen kan du få en förberedd flaskpost från mig och varje flaskpost kommer
            till dig precis den dagen du behöver det
          </p>
          <p>
            varje dag när du går in på den här sidan kommer det finnas en flaskpost för dig att
            hämta på ett helt magiskt sätt kommer den flaskposten innehålla precis vad du behöver
            den dagen
          </p>
          <p>
            okej det funkar så här varje dag kan du skriva en dagboksanteckning en så kallad entry
          </p>
          <p>
            kort eller hur lång som helst om vad du har gjort och hur du känner kring vad som helst
            som jag aldrig kommer läsa det är bara du som kan se den
          </p>
          <p>
            sen med magi så väljer hemsidan en flaskpost som jag tror du vill ha just då
          </p>
          <p>
            du kan se alla dina tidigare entries i history men bara du kan se dem ingen annan
          </p>
          <p>
            så skapa ett konto skriv en entry så kanske du får en flaskpost
          </p>
        </div>

        <button
          onClick={handleContinue}
          className="mt-8 w-full sm:w-auto px-8 py-3 text-sm sm:text-base text-black bg-[#ff006e] hover:bg-[#ff0080] transition font-mono"
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}
