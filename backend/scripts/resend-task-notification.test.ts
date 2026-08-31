import { ResendProvider } from '../src/mail/resend.provider'
import { MailService } from '../src/mail/mail.service'

async function runResendTest() {
  console.log('=== Running Resend Task Notification Template & Payload Test ===')

  let capturedOptions: any = null

  // Mock PrismaService
  const mockPrisma: any = {
    tenant: {
      findUnique: async () => ({
        resend_api_key: 're_test_key_12345',
        resend_from_email: 'notifications@agency.com',
        name: 'Test Agency',
      }),
    },
  }

  const resendProvider = new ResendProvider(mockPrisma)

  // Intercept sendMail to verify options
  const originalSendMail = resendProvider.sendMail.bind(resendProvider)
  resendProvider.sendMail = async (options: any) => {
    capturedOptions = options
    return originalSendMail(options)
  }

  const mailService = new MailService(resendProvider)

  // Dispatch email with 5 required template variables & Resend parameters
  const result = await mailService.sendTaskNotificationEmail({
    recipientEmail: 'client@brand.com',
    taskTitle: 'Q3 Brand Campaign Strategy',
    taskUrl: 'http://localhost:5173/tasks?id=task-101',
    actorName: 'John PM',
    notificationType: 'task_assigned',
    resendApiKey: 're_test_key_12345',
    fromEmail: 'notifications@agency.com',
    subject: '[TASK ASSIGNED] Task Update: Q3 Brand Campaign Strategy',
  })

  console.log('Test Result:', result)
  console.log('Captured Options:', capturedOptions)

  if (!result.success) {
    throw new Error('Email dispatch failed')
  }

  if (capturedOptions.to !== 'client@brand.com') {
    throw new Error(`Expected recipient Email 'client@brand.com', got '${capturedOptions.to}'`)
  }

  if (capturedOptions.fromEmail !== 'notifications@agency.com') {
    throw new Error(`Expected fromEmail 'notifications@agency.com', got '${capturedOptions.fromEmail}'`)
  }

  if (capturedOptions.resendApiKey !== 're_test_key_12345') {
    throw new Error(`Expected resendApiKey 're_test_key_12345', got '${capturedOptions.resendApiKey}'`)
  }

  if (!capturedOptions.html.includes('Q3 Brand Campaign Strategy')) {
    throw new Error('Email HTML body missing taskTitle variable')
  }

  if (!capturedOptions.html.includes('John PM')) {
    throw new Error('Email HTML body missing actorName variable')
  }

  if (!capturedOptions.html.includes('task_assigned')) {
    throw new Error('Email HTML body missing notificationType variable')
  }

  if (!capturedOptions.html.includes('http://localhost:5173/tasks?id=task-101')) {
    throw new Error('Email HTML body missing taskUrl variable')
  }

  console.log('✅ ALL 5 REQUIRED TEMPLATE VARIABLES AND RESEND PAYLOAD FIELDS VERIFIED SUCCESSFULLY!')
}

runResendTest().catch((err) => {
  console.error('❌ Test Failed:', err)
  process.exit(1)
})
