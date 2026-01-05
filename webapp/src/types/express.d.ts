import { User as AppUser } from '../helpers/schema';

declare global {
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface User extends AppUser { }
    }
}
