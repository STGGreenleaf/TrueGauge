import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function getCurrentOrganization() {
  const user = await requireAuth()
  
  const orgUser = await prisma.organizationUser.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: 'asc' }, // Get first/primary org
  })

  if (!orgUser) {
    // User exists but has no org - create one
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      redirect('/login')
    }
    
    const org = await prisma.organization.create({
      data: {
        name: `${dbUser.name || 'My'}'s Business`,
        users: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
        settings: {
          create: {
            businessName: `${dbUser.name || 'My'}'s Business`,
          },
        },
      },
    })
    
    return org
  }

  return orgUser.organization
}

export async function getOrganizationId(): Promise<string> {
  const org = await getCurrentOrganization()
  return org.id
}
