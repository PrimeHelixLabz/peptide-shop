declare module "@link.money/linkmoney-web" {
  interface LinkMoneyOptions {
    sessionUrl: string
    environment?: string
    sessionVersion?: number
  }

  export class LinkMoney {
    constructor(options: LinkMoneyOptions)
    open(): void
    close(): void
  }
}
