import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';
import pino from 'pino';

const logger = pino();

dotenv.config();
const secretKey = process.env.ACCESS_TOKEN_JWT_KEY

export const encodeToken = (data) => {
    return jwt.sign({data}, secretKey, {expiresIn: '1h'})
}

export const decodeToken = (data) => {
    try{
        const decoded = jwt.verify(data,secretKey );
        return decoded.data
    }catch(error){
        logger.error(`${error}: Something went wrong to decode the accessToken`);
        return null
    }
}