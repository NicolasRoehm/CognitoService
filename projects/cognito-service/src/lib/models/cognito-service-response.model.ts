export class CognitoServiceResponse
{
  public type : string;
  public data : any;

  constructor(type : string, data : any)
  {
    this.type = type;
    this.data = data;
  }
}