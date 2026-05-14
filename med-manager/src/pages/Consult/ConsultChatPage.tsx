import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { DOCTORS } from '../../constants/doctors'
import { DEPARTMENTS } from '../../constants/departments'

interface ChatMessage {
  id: string
  sender: 'doctor' | 'user'
  text?: string
  images?: string[]
}

interface PendingImage {
  id: string
  name: string
  url: string
}

export function ConsultChatPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const chatScrollRef = useRef<HTMLElement | null>(null)
  const deptId = searchParams.get('dept') ?? ''
  const doctorId = searchParams.get('doctor') ?? ''

  const department = DEPARTMENTS.find((d) => d.id === deptId)
  const doctor = DOCTORS.find((d) => d.id === doctorId)

  const initialMessages = useMemo<ChatMessage[]>(
    () =>
      doctor
        ? [
            {
              id: 'welcome',
              sender: 'doctor',
              text: `您好，我是${doctor.name}。请描述您的症状、用药情况或上传相关照片，我会根据您提供的信息给出建议。`,
            },
          ]
        : [],
    [doctor],
  )

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [text, setText] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])

  useEffect(() => {
    setMessages(initialMessages)
    setText('')
    setImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.url))
      return []
    })
  }, [initialMessages])

  useEffect(() => {
    const node = chatScrollRef.current
    if (!node) return
    window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight
    })
  }, [messages])

  if (!department || !doctor) {
    return (
      <PageLayout title="在线问诊">
        <p className="text-body text-[var(--color-text-secondary)]">参数缺失，请重新选择医生。</p>
      </PageLayout>
    )
  }

  const handleBack = () => {
    navigate(`/consult?view=doctor&dept=${deptId}`)
  }

  const handleChooseImages = () => {
    fileInputRef.current?.click()
  }

  const handleTakePhoto = () => {
    cameraInputRef.current?.click()
  }

  const handleImageChange = (files: FileList | null) => {
    if (!files) return
    const next = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 6 - images.length))
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        url: URL.createObjectURL(file),
    }))
    setImages((prev) => [...prev, ...next])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && images.length === 0) return

    const imageUrls = images.map((image) => image.url)
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: trimmed || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    }
    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'doctor',
      text: '已收到您的问题。请继续补充症状持续时间、近期血压/血糖记录、正在服用的药品名称和剂量。',
    }

    setMessages((prev) => [...prev, userMessage, reply])
    setText('')
    setImages([])
  }

  return (
    <PageLayout>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-card)]">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
          <div className="mb-2">
            <Button variant="ghost" className="min-h-0 px-0 py-1" onClick={handleBack}>
              ← 返回医生列表
            </Button>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-card-title text-[var(--color-text-primary)]">{doctor.name}</h1>
              <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
                {department.name} · {doctor.title}
              </p>
              <p className="mt-1 text-caption text-[var(--color-text-secondary)]">{doctor.specialty}</p>
            </div>
            {doctor.availableSlots && doctor.availableSlots.length > 0 ? (
              <div className="max-w-full rounded-lg bg-[var(--color-primary-light)] px-2 py-1 text-caption text-[var(--color-primary)]">
                可预约：{doctor.availableSlots.join('；')}
              </div>
            ) : null}
          </div>
        </header>

        <section
          ref={chatScrollRef}
          className="overflow-y-auto bg-[var(--color-bg)] p-3"
          style={{ height: '340px' }}
          aria-label="问诊对话记录"
        >
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-card px-3 py-2 text-body ${
                    message.sender === 'user'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white text-[var(--color-text-primary)]'
                  }`}
                >
                  {message.text ? <p>{message.text}</p> : null}
                  {message.images && message.images.length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {message.images.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt="用户上传的问诊照片"
                          className="h-24 w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-[var(--color-border)] bg-[var(--color-card)] p-4">
          {images.length > 0 ? (
            <div className="mb-2 grid grid-cols-3 gap-2">
              {images.map((image) => (
                <div key={image.id} className="relative overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <img src={image.url} alt={image.name} className="h-20 w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-[var(--color-text-primary)] px-2 py-0.5 text-caption text-white"
                    onClick={() => handleRemoveImage(image.id)}
                    aria-label={`移除照片 ${image.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <textarea
            className="min-h-[96px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-white px-3 py-3 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
            placeholder="输入症状、用药情况、检查结果等问题"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => handleImageChange(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => handleImageChange(e.target.files)}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" type="button" className="px-4 py-2 text-[16px]" onClick={handleTakePhoto}>
                拍照
              </Button>
              <Button variant="secondary" type="button" className="px-4 py-2 text-[16px]" onClick={handleChooseImages}>
                上传照片
              </Button>
            </div>
            <Button
              type="button"
              className="px-5 py-2 text-[16px]"
              onClick={handleSend}
              disabled={!text.trim() && images.length === 0}
            >
              发送提问
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
