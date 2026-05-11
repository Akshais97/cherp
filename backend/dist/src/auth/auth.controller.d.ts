import { RequestUser } from '../common/types/request-user.type';
export declare class AuthController {
    logout(user: RequestUser): {
        user_id: string;
        message: string;
    };
}
