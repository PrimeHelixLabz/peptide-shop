declare module "@link.money/linkmoney-web" {
  interface LinkInstanceOptions {
    sessionUrl: string
    environment?: string
    sessionVersion?: number
    sessionKey?: string
    redirect?: string
    custom?: Record<string, unknown>
  }

  interface LinkInstance {
    createButton(): HTMLButtonElement
    callSessionUrl(event?: Event): void
    getVersion(): string
    isInitiated(): boolean
    getSessionKey(): string
    getLinkSessionVersion(): number
  }

  class Link {
    static LinkInstance(options: LinkInstanceOptions): LinkInstance
    static getLinkInstances(): LinkInstance[]
    static getCustomer(
      customerId: string,
      auth: string
    ): Promise<unknown>
    static getAccounts(
      customerId: string,
      auth: string
    ): Promise<unknown>
  }

  export default Link
}
