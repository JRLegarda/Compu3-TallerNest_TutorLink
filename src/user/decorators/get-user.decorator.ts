import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";

export const GetUser = createParamDecorator((data, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if(!user) throw new InternalServerErrorException("User doesn't exist")
    return !data ? user: user[data];
}) 