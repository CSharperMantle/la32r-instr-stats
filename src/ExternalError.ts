class ExternalError extends Error {
  public innerError?: any

  constructor(message: string, innerError?: any) {
    super(message)
    this.name = "ExternalError"
    this.innerError = innerError
  }
}

export default ExternalError
