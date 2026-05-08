# 慢病用药小管家 — 项目开发指南

## 项目概述

本项目为「慢病用药小管家」单页 Web 应用（SPA），面向中老年慢病患者及照护者，聚合用药管理与问诊相关能力，打通**在线问诊 → 复诊 → 处方 → 购药 → 用药提醒 → 库存管理 → 续方**完整闭环。

## 技术栈

| 类别 | 方案 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 路由 | React Router v6 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS + CSS 变量（设计 token） |
| 持久化 | localStorage，单一 root key `med-manager-data` |
| 日期 | 原生 `Date`，设备本地时区 |
| 通知 | Web Notification API |

## 项目结构

```
med-manager/
├── src/
│   ├── main.tsx              # 入口
│   ├── App.tsx               # 路由与全局 Layout
│   ├── types/                # TypeScript 类型定义
│   │   ├── index.ts          # 所有实体类型（AppPersistRoot 等）
│   │   └── enums.ts          # 枚举（状态、来源等）
│   ├── store/                # Zustand store
│   │   ├── index.ts          # store 入口
│   │   ├── slices/           # 各领域 slice
│   │   └── persist.ts        # localStorage 读写与迁移
│   ├── services/             # 纯函数领域服务
│   │   ├── drugService.ts    # 药品合并键规范化、扣减
│   │   ├── doseService.ts    # 应服实例生成（懒生成+幂等）
│   │   ├── reminderService.ts # 提醒生成、合并、钳制算法
│   │   └── reconcileService.ts # Q-06 状态机、处方过期 reconcile
│   ├── pages/                # 页面组件（对应五 Tab）
│   │   ├── Home/             # 首页仪表盘
│   │   ├── Consult/          # 在线问诊
│   │   ├── Plan/             # 用药计划
│   │   ├── Prescription/     # 复诊处方
│   │   └── Profile/          # 个人中心
│   ├── components/           # 通用组件
│   │   ├── ui/               # 基础 UI（Button、Toast、Modal 等）
│   │   ├── layout/           # TabBar、PageLayout
│   │   └── business/         # 业务组件（DrugCard、DoseItem 等）
│   ├── hooks/                # 自定义 Hooks
│   ├── constants/            # 静态配置（科室、医生、默认参数）
│   │   ├── departments.ts    # 科室数据（构建时打包）
│   │   ├── doctors.ts        # 医生数据
│   │   └── defaults.ts       # 默认业务参数（附录 B）
│   └── utils/                # 工具函数
│       ├── date.ts           # 业务日封装
│       └── storage.ts        # localStorage 工具
├── public/
├── index.html
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## 核心数据模型

持久化根结构存储在 `localStorage` key `med-manager-data` 下：

```typescript
interface AppPersistRoot {
  schemaVersion: number;        // 初始值 1，支持链式迁移
  userProfile: UserProfile;
  drugMasters: DrugMaster[];
  stockBatches: StockBatch[];
  medicationPlans: MedicationPlan[];
  doseRecords: DoseRecord[];
  consultations: ConsultationOrder[];
  prescriptions: Prescription[];
  followUps: FollowUpEvent[];
  reminders: ReminderFeedItem[];
  settings: AppSettings;
  meta: {
    disclaimerAcceptedAt?: string;
    lastLargeTimeJumpHintAt?: string;
    demoDataLoadedAt?: string;
  };
}
```

## 关键业务规则（必读）

### 1. 应服实例生成策略
- 采用**懒生成+幂等**：渲染当日清单时动态计算，结果写入 `doseRecords`（不重复生成）
- 不预生成未来记录，避免存储膨胀

### 2. 药品合并键规范化
规范化管道：Unicode NFC → 全角半角 → 空白折叠 → 英文小写 → 单位映射
- 无法映射单位：**阻断保存**，提示用户统一单位
- 碰撞检测在**保存时**执行，可选实时预检测（输入 debounce 500ms）

### 3. 库存扣减（FIFO）
- 批次按入库时间升序，先扣最早批次
- 多计划同药：按计划 `createdAt` 升序依次扣减
- 库存不足：禁止已服/补服，按钮 disabled + Toast

### 4. 补服策略
- 当日 24:00 前补服：计入计划日依从
- 跨日补服：任意历史日均可，库存扣减归属操作日，分子计入操作日

### 5. 提醒钳制（R/U 算法）
- `R`：处方剩余完整自然日（不含失效日当天）
- `R=0`：走过期链路，不发续方提醒
- `U≥R>0`：不单独发续方提醒，进入临期窗时合并一条
- `U<R`：按「失效前 U 天」独立发续方提醒

### 6. Q-06 状态机
- 以 `visibilitychange` 为主策略触发 reconcile，`setInterval`(60s) 作补充
- 已预约 → 待就诊：预约日 00:00
- 待就诊 → 已完成（自动）：预约日 +1 天 24:00

### 7. 处方来源枚举
```typescript
enum PrescriptionSource {
  ConsultImage = 'consult_image',    // 图文问诊生成
  ConsultRenewal = 'consult_renewal', // 续方问诊生成
  Import = 'import',                 // 处方导入
  Manual = 'manual',                 // 手动录入
}
```

### 8. M-02 处方导入
- 导入用药计划时**不自动入库**
- 入库须用户另行通过 P-04 确认购药

## 设计规范

### CSS 变量（必须与 PRD 一致）
```css
--color-bg: #F5F8FA;
--color-card: #FFFFFF;
--color-primary: #4A8FC7;
--color-primary-hover: #3A7DB5;
--color-primary-light: #D9ECF7;
--color-success: #5DA882;
--color-success-light: #E5F4EC;
--color-text-primary: #2D3A45;
--color-text-secondary: #5C6B7A;
--color-border: #E2E8EF;
--color-warn: #A67C00;
--color-warn-bg: #FDF6E3;
--color-error: #B54747;
--color-error-bg: #FDEDED;
--tag-pending-consult: ...;
--tag-booked: ...;
--tag-due: ...;
--tag-done: ...;
--tag-missed: ...;
--tag-makeup: ...;
--tag-stock-low: ...;
--tag-rx-expiring: ...;
--tag-rx-expired: ...;
```

### 布局常量
- 安全边距：16px
- 卡片圆角：12px
- 列表行最小高度：72px
- 主按钮高度：48px
- 热区最小：44px × 44px
- 桌面最大宽度：640px 居中

### 字号
- 根字号：16px（1rem = 16px）
- 正文：17px，行高 1.55
- 大标题：22px，行高 1.35，600
- 卡片标题：18px，行高 1.4，600
- 辅助说明：15px，行高 1.5
- 关键数字：20px-22px，行高 1.3，600
- 全站正文下限：16px；辅助下限：14px

## 开发规范

- **简体中文硬编码**：界面文案与 Toast 均为简体中文，不引入 i18n
- **单标签使用**：多标签页以最后写入为准，README 需说明
- **无演示开关**：「允许透支」等演示开关默认关闭，不设入口
- **localStorage 写失败**：禁止静默失败，Toast 提示 + 重试 1 次
- **接近配额预警**：剩余 < 200KB 时 Toast 提示（每次会话最多 1 次）

## 首屏性能目标

Chrome Fast 3G（RTT 150ms / 下行 1.6Mbps）：
- 冷启动 LCP ≤ 3.0s，FCP ≤ 2.0s
- 热启动 LCP ≤ 1.5s
- H-02 完成率：纯 CSS（conic-gradient 或 SVG 描边）不引入图表库

## MVP 范围（P0 必做）

- H-01、H-03、H-04、H-05（首页仪表盘）
- M-01、M-03、M-04（用药计划核心）
- S-01、S-02、S-03（库存管理）
- Q-01 至 Q-06（在线问诊演示闭环）
- P-01、P-02、P-04、P-06（处方与购药）
- U-01、U-02、U-03（个人中心档案/归档/设置）
- 提醒合并逻辑与无权限站内兜底
- 免责声明展示

## 相关文档

- [需求文档.md](./需求文档.md) — PRD v1.3
- [技术方案.md](./技术方案.md) — 技术方案 v1.2
