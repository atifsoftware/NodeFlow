/**
 * NodeFlow Storage Manager
 * ফাইল আপলোড এবং ক্লাউড স্টোরেজ ম্যানেজমেন্ট
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class StorageManager {
    constructor(config = {}) {
        this.config = {
            driver: config.driver || 'local',
            local: {
                root: config.local?.root || './public/uploads',
                url: config.local?.url || '/uploads'
            },
            s3: {
                bucket: config.s3?.bucket || '',
                region: config.s3?.region || 'us-east-1',
                accessKeyId: config.s3?.accessKeyId || '',
                secretAccessKey: config.s3?.secretAccessKey || ''
            }
        };

        this.drivers = {};
        this.registerDriver('local', new LocalDriver(this.config.local));
        
        if (this.config.s3.bucket) {
            this.registerDriver('s3', new S3Driver(this.config.s3));
        }

        this.currentDriver = this.drivers[this.config.driver];
    }

    /**
     * কাস্টম ড্রাইভার রেজিস্টার করা
     */
    registerDriver(name, driver) {
        this.drivers[name] = driver;
    }

    /**
     * ড্রাইভার পরিবর্তন করা
     */
    use(driverName) {
        if (!this.drivers[driverName]) {
            throw new Error(`Driver "${driverName}" not found`);
        }
        this.currentDriver = this.drivers[driverName];
        return this;
    }

    /**
     * ফাইল আপলোড করার জন্য মিডেলওয়্যার
     */
    upload(options = {}) {
        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                const destPath = options.path || '';
                const fullPath = path.join(this.config.local.root, destPath);
                await fs.mkdir(fullPath, { recursive: true });
                cb(null, fullPath);
            },
            filename: (req, file, cb) => {
                const ext = path.extname(file.originalname);
                const name = options.keepOriginalName 
                    ? path.basename(file.originalname, ext) 
                    : uuidv4();
                cb(null, `${name}${ext}`);
            }
        });

        const fileFilter = (req, file, cb) => {
            if (options.allowedMimeTypes) {
                if (!options.allowedMimeTypes.includes(file.mimetype)) {
                    return cb(new Error('Invalid file type'), false);
                }
            }
            if (options.allowedExtensions) {
                const ext = path.extname(file.originalname).toLowerCase();
                if (!options.allowedExtensions.includes(ext)) {
                    return cb(new Error('Invalid file extension'), false);
                }
            }
            cb(null, true);
        };

        return multer({
            storage,
            fileFilter,
            limits: {
                fileSize: options.maxSize || 5 * 1024 * 1024 // 5MB default
            }
        });
    }

    /**
     * ফাইল সংরক্ষণ করা
     */
    async put(filePath, content, options = {}) {
        return await this.currentDriver.put(filePath, content, options);
    }

    /**
     * ফাইল পড়া
     */
    async get(filePath) {
        return await this.currentDriver.get(filePath);
    }

    /**
     * ফাইল ডিলিট করা
     */
    async delete(filePath) {
        return await this.currentDriver.delete(filePath);
    }

    /**
     * ফাইল exists কিনা চেক করা
     */
    async exists(filePath) {
        return await this.currentDriver.exists(filePath);
    }

    /**
     * ফাইল URL পাওয়া
     */
    url(filePath) {
        return this.currentDriver.url(filePath);
    }

    /**
     * ফাইল সাইজ পাওয়া
     */
    async size(filePath) {
        return await this.currentDriver.size(filePath);
    }

    /**
     * ফাইল কপি করা
     */
    async copy(from, to) {
        return await this.currentDriver.copy(from, to);
    }

    /**
     * ফাইল মুভ করা
     */
    async move(from, to) {
        return await this.currentDriver.move(from, to);
    }
}

/**
 * Local File Driver
 */
class LocalDriver {
    constructor(config) {
        this.root = config.root;
        this.urlPrefix = config.url;
    }

    async put(filePath, content, options = {}) {
        const fullPath = path.join(this.root, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
        return this.url(filePath);
    }

    async get(filePath) {
        const fullPath = path.join(this.root, filePath);
        return await fs.readFile(fullPath);
    }

    async delete(filePath) {
        const fullPath = path.join(this.root, filePath);
        await fs.unlink(fullPath);
        return true;
    }

    async exists(filePath) {
        const fullPath = path.join(this.root, filePath);
        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    url(filePath) {
        return `${this.urlPrefix}/${filePath}`.replace(/\\/g, '/');
    }

    async size(filePath) {
        const fullPath = path.join(this.root, filePath);
        const stats = await fs.stat(fullPath);
        return stats.size;
    }

    async copy(from, to) {
        const fromPath = path.join(this.root, from);
        const toPath = path.join(this.root, to);
        await fs.mkdir(path.dirname(toPath), { recursive: true });
        await fs.copyFile(fromPath, toPath);
        return this.url(to);
    }

    async move(from, to) {
        const fromPath = path.join(this.root, from);
        const toPath = path.join(this.root, to);
        await fs.mkdir(path.dirname(toPath), { recursive: true });
        await fs.rename(fromPath, toPath);
        return this.url(to);
    }
}

/**
 * AWS S3 Driver
 */
class S3Driver {
    constructor(config) {
        const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
        
        this.client = new S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey
            }
        });
        this.bucket = config.bucket;
    }

    async put(filePath, content, options = {}) {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
            Body: content,
            ContentType: options.contentType || 'application/octet-stream'
        });

        await this.client.send(command);
        return this.url(filePath);
    }

    async get(filePath) {
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath
        });

        const response = await this.client.send(command);
        return await this.streamToBuffer(response.Body);
    }

    async delete(filePath) {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: filePath
        });

        await this.client.send(command);
        return true;
    }

    async exists(filePath) {
        try {
            await this.head(filePath);
            return true;
        } catch {
            return false;
        }
    }

    url(filePath) {
        return `https://${this.bucket}.s3.amazonaws.com/${filePath}`;
    }

    async size(filePath) {
        const metadata = await this.head(filePath);
        return parseInt(metadata.ContentLength, 10);
    }

    async copy(from, to) {
        const { CopyObjectCommand } = require('@aws-sdk/client-s3');
        
        const command = new CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${from}`,
            Key: to
        });

        await this.client.send(command);
        return this.url(to);
    }

    async move(from, to) {
        await this.copy(from, to);
        await this.delete(from);
        return this.url(to);
    }

    async head(filePath) {
        const { HeadObjectCommand } = require('@aws-sdk/client-s3');
        
        const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: filePath
        });

        return await this.client.send(command);
    }

    async streamToBuffer(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
}

module.exports = StorageManager;
