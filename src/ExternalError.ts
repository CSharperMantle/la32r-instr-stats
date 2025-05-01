class ExternalError<E> extends Error {
  public innerError?: E

  constructor(message: string, innerError?: E) {
    super(message)
    this.name = "ExternalError"
    this.innerError = innerError
  }
}

export default ExternalError
